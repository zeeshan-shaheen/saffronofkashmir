#!/usr/bin/env python3
"""Fail if generated output contains junk values from JavaScript coercion.

Why this exists
---------------
`node --check` accepts `x + + y` because it is valid JavaScript. On 29 Aug 2026
a stray unary plus in templates.js coerced a string to NaN, and every WhatsApp
order button shipped `NaNcard` in place of its data-wa-pos attribute. It reached
production and stayed there.

The existing suite could not have caught it:
  - node --check     validates syntax, and the syntax was valid
  - JSON.parse       validates the data file, and the data was fine
  - Build check CI   compares committed output against a rebuild, and the
                     output faithfully reflected the buggy source, so it matched

Nothing looked at what the pages actually said. This does.

Scope
-----
HTML: the markup outside <script> and <style> content. That covers text nodes,
attribute values, and attribute NAMES. Names matter: the NaN bug produced a
malformed attribute name (`NaNcard"`), not a value, so a value-only check would
have missed the exact defect this exists to prevent.

Inline <script> content is masked, because the analytics snippets are hand
written JavaScript where these words can legitimately appear. <script
type="application/ld+json"> is the exception: it is parsed as JSON and the JSON
rule below is applied to it.

JSON (build-id.json and every ld+json block): only STRING VALUES are checked. A
real JSON null literal is valid and is never reported.

Plain text (llms.txt): scanned as text.

There is deliberately no allowlist, no skip flag and no environment variable
that bypasses this. If a page ever legitimately needs one of these words, this
file gets changed on purpose, in a reviewable commit.

Usage:  python tools/check_output.py          (exit 1 on any finding)
"""
import json
import os
import re
import sys

try:  # page copy contains emoji; a cp1252 console would crash mid-report
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Case sensitive, and matched as substrings rather than whole words. JavaScript
# coercion concatenates, so the real defect appeared as `NaNcard`, not a bare
# `NaN`. Requiring a word boundary would have let the original bug through.
TOKENS = ["[object Object]", "-Infinity", "Infinity", "NaN", "undefined", "null"]

# Exact string values that are junk when they appear as a JSON string.
JSON_TOKENS = {"NaN", "undefined", "[object Object]", "Infinity", "-Infinity", "null"}

SCRIPT_OR_STYLE = re.compile(
    r"<(script|style)\b[^>]*>.*?</\1\s*>", re.S | re.I)
LD_JSON = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.S | re.I)


def generated_files():
    """Every file build.js writes, 31 of them."""
    out = []
    for name in sorted(os.listdir(ROOT)):
        if name.endswith(".html") and name != "admin.html":
            out.append(name)
    for sub in ("products", "blog"):
        d = os.path.join(ROOT, sub)
        if not os.path.isdir(d):
            continue
        for slug in sorted(os.listdir(d)):
            p = os.path.join(sub, slug, "index.html")
            if os.path.isfile(os.path.join(ROOT, p)):
                out.append(p.replace("\\", "/"))
    for extra in ("sitemap.xml", "llms.txt", "build-id.json"):
        if os.path.isfile(os.path.join(ROOT, extra)):
            out.append(extra)
    return out


def blank(m):
    """Blank a matched region, keeping newlines so line numbers stay true."""
    return re.sub(r"[^\n]", " ", m.group(0))


def scan_text(rel, text, findings, kind):
    for lineno, line in enumerate(text.splitlines(), 1):
        for tok in TOKENS:
            col = line.find(tok)
            if col == -1:
                continue
            snippet = line[max(0, col - 45):col + len(tok) + 45].strip()
            findings.append((rel, lineno, tok, kind, snippet))
            break  # one finding per line is enough to fail and locate it


def walk_json(node, path, rel, findings, where):
    if isinstance(node, dict):
        for k, v in node.items():
            walk_json(v, path + "." + str(k), rel, findings, where)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk_json(v, path + "[" + str(i) + "]", rel, findings, where)
    elif isinstance(node, str):
        if node.strip() in JSON_TOKENS:
            findings.append((rel, 0, node.strip(), where,
                             path.lstrip(".") + " = " + json.dumps(node)))
    # a genuine JSON null arrives as Python None and is intentionally ignored


def check_html(rel, raw, findings):
    # ld+json is data, not code: parse it and apply the JSON rule.
    for m in LD_JSON.finditer(raw):
        block = m.group(1).strip()
        try:
            walk_json(json.loads(block), "", rel, findings, "json-ld string value")
        except ValueError as e:
            findings.append((rel, raw[:m.start()].count("\n") + 1, "INVALID JSON-LD",
                             "json-ld", str(e)[:90]))
    # Blank every <script>/<style> element, then scan the markup that remains.
    scan_text(rel, SCRIPT_OR_STYLE.sub(blank, raw), findings, "markup")


def main():
    findings = []
    files = generated_files()
    for rel in files:
        path = os.path.join(ROOT, rel)
        raw = open(path, encoding="utf-8").read()
        if rel.endswith(".html"):
            check_html(rel, raw, findings)
        elif rel.endswith(".json"):
            try:
                walk_json(json.loads(raw), "", rel, findings, "json string value")
            except ValueError as e:
                findings.append((rel, 0, "INVALID JSON", "json", str(e)[:90]))
        else:
            scan_text(rel, raw, findings, "text")

    print("checked " + str(len(files)) + " generated files")
    if not findings:
        print("OK  no junk tokens in generated output")
        return 0

    print("")
    print("FAIL  " + str(len(findings)) + " junk token(s) in generated output")
    print("")
    by_file = {}
    for rel, lineno, tok, kind, snippet in findings:
        by_file.setdefault(rel, []).append((lineno, tok, kind, snippet))
    for rel in sorted(by_file):
        print(rel + "  (" + str(len(by_file[rel])) + ")")
        for lineno, tok, kind, snippet in by_file[rel][:10]:
            loc = ":" + str(lineno) if lineno else ""
            print("  " + rel + loc + "  [" + kind + "]  " + tok)
            print("      " + snippet)
        if len(by_file[rel]) > 10:
            print("  ... and " + str(len(by_file[rel]) - 10) + " more in this file")
        print("")
    print("These are JavaScript coercion artefacts. Fix the template that")
    print("produced them, rebuild, and run this again.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
