#!/usr/bin/env python3
"""Validate that every JSON-LD block in generated output parses.

Hard rule 2 requires valid, parseable JSON-LD on every generated page. A block
that fails to parse is invisible to Google's structured-data pipeline and
silently forfeits whatever rich result it was written for. Nothing else in the
suite parses these: node --check reads the templates, not the output, and
tools/check_output.py only inspects string values inside blocks that already
parsed.

Covers all 28 generated pages. 404.html legitimately carries no JSON-LD and is
reported, not failed. Exit is non-zero only when a block is present and
malformed.

This used to be reproduced as a listing in CLAUDE.md, where it drifted: the
listing checked 3 pages while the copy people ran checked 28. Prose cannot be
diffed. Do not paste a copy back into the docs.

Usage:  python tools/check_jsonld.py
"""
import glob
import json
import os
import re
import sys

try:  # page copy contains emoji; a cp1252 console would crash mid-report
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK = re.compile(
    r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', re.S)


def pages():
    out = [os.path.basename(p) for p in sorted(glob.glob(os.path.join(REPO, "*.html")))
           if os.path.basename(p) != "admin.html"]
    for sub in ("products", "blog"):
        for p in sorted(glob.glob(os.path.join(REPO, sub, "*", "index.html"))):
            out.append(os.path.relpath(p, REPO).replace("\\", "/"))
    return out


def main():
    ok = bad = none = 0
    for rel in pages():
        s = open(os.path.join(REPO, rel), encoding="utf-8").read()
        blocks = BLOCK.findall(s)
        if not blocks:
            print(rel + ": NO JSON-LD")
            none += 1
            continue
        for i, b in enumerate(blocks):
            try:
                json.loads(b.strip())
                ok += 1
            except ValueError as e:
                print(rel + " block " + str(i) + ": INVALID - " + str(e))
                bad += 1
    print("")
    print("VALID " + str(ok) + "   INVALID " + str(bad) +
          "   PAGES WITHOUT JSON-LD " + str(none))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
