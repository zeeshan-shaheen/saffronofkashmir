#!/usr/bin/env python3
"""Compare generated page text against a baseline captured before your edits.

Scope
-----
Compares VISIBLE TEXT plus <title> TEXT. Tags are stripped whole, so attribute
values (data-wa-pos, meta content, href) and <script> contents including JSON-LD
are NOT compared. Verify those with targeted greps or tools/check_output.py.

A green run means no unintended change to visible copy. It is NOT evidence that
a fix landed.

Reports EVERY changed block on a page, not just the first. An earlier version
stopped at the first difference and hid a real body change on a page that also
had a title change: the run printed the same result before and after the fix.
Blocks come from difflib opcodes, so a title change of a different word count
does not cascade into false diffs down the rest of the page.

Baselines live OUTSIDE the repo. `.nojekyll` publishes underscore-prefixed
directories, so a baseline of extracted page text committed here would ship as
plain-text duplicates of every page. This script refuses to write one inside
the repo.

Usage
-----
  python tools/parity_check.py capture     before editing, from a clean tree
  python tools/parity_check.py             after editing

  --baseline DIR   where to keep the baseline
                   (default: <system temp>/sok-parity-baseline)
"""
import argparse
import difflib
import glob
import html
import os
import re
import sys
import tempfile

try:  # page copy contains emoji; a cp1252 console would crash mid-report
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_BASELINE = os.path.join(tempfile.gettempdir(), "sok-parity-baseline")
CONTEXT = 6


def textof(path):
    s = open(path, encoding="utf-8").read()
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def pages():
    out = [os.path.basename(p) for p in sorted(glob.glob(os.path.join(REPO, "*.html")))
           if os.path.basename(p) != "admin.html"]
    for sub in ("products", "blog"):
        for p in sorted(glob.glob(os.path.join(REPO, sub, "*", "index.html"))):
            out.append(os.path.relpath(p, REPO).replace("\\", "/"))
    return out


def guard(baseline):
    """Never let a baseline of page text be written inside the repo.

    normcase matters: on Windows the repo path arrives from __file__ as
    "D:\\..." while an argument may normalise to "d:\\...", and a plain
    startswith on those two silently lets the baseline through.
    """
    b = os.path.normcase(os.path.abspath(baseline))
    r = os.path.normcase(REPO)
    if b == r or b.startswith(r + os.sep):
        sys.exit("refusing to write a baseline inside the repo: " + b +
                 "\n.nojekyll would publish it as duplicate page text."
                 "\nPass --baseline with a path outside " + REPO)


def capture(baseline):
    guard(baseline)
    os.makedirs(baseline, exist_ok=True)
    names = pages()
    for rel in names:
        dst = os.path.join(baseline, rel.replace("/", "__") + ".txt")
        open(dst, "w", encoding="utf-8").write(textof(os.path.join(REPO, rel)))
    print("captured " + str(len(names)) + " pages to " + baseline)


def compare(baseline):
    guard(baseline)
    ok = changed = missing = total = 0
    for rel in pages():
        b = os.path.join(baseline, rel.replace("/", "__") + ".txt")
        if not os.path.exists(b):
            print("NO BASELINE: " + rel)
            missing += 1
            continue
        old = open(b, encoding="utf-8").read().strip()
        new = textof(os.path.join(REPO, rel))
        if old == new:
            ok += 1
            continue
        ow, nw = old.split(), new.split()
        blocks = [o for o in difflib.SequenceMatcher(None, ow, nw, autojunk=False)
                  .get_opcodes() if o[0] != "equal"]
        changed += 1
        total += len(blocks)
        print(rel + "  (" + str(len(blocks)) + " changed block" +
              ("" if len(blocks) == 1 else "s") + ")")
        for n, (tag, i1, i2, j1, j2) in enumerate(blocks, 1):
            print("  [" + str(n) + "] " + tag + " at word " + str(i1))
            before = " ".join(ow[max(0, i1 - CONTEXT):i1])
            if before:
                print("      after: ..." + before)
            print("      old: " + (" ".join(ow[i1:i2]) or "(nothing)"))
            print("      new: " + (" ".join(nw[j1:j2]) or "(nothing)"))
        print("")
    print("PAGES OK " + str(ok) + "   PAGES CHANGED " + str(changed) +
          "   CHANGED BLOCKS " + str(total) + "   MISSING BASELINE " + str(missing) +
          "   TOTAL " + str(ok + changed + missing))
    if missing:
        print("")
        print("Capture a baseline from a clean tree first:"
              "  python tools/parity_check.py capture")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Parity check for generated page text.")
    ap.add_argument("mode", nargs="?", default="compare", choices=["capture", "compare"])
    ap.add_argument("--baseline", default=DEFAULT_BASELINE,
                    help="baseline directory, must be outside the repo "
                         "(default: " + DEFAULT_BASELINE + ")")
    a = ap.parse_args()
    capture(a.baseline) if a.mode == "capture" else compare(a.baseline)
