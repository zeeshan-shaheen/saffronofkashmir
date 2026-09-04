#!/usr/bin/env python3
"""Fail when a tracked figure is stated with conflicting values.

Why this scans SOURCE and not generated output
----------------------------------------------
tools/check_product_ids.py deliberately reads generated HTML, so it cannot
drift from the slug logic in templates.js. This check does the opposite on
purpose.

Figures live in data/site-data.json, and the file contains unpublished drafts.
The harvest-diary draft already carries the same hectare and yield figures as
four live posts. A generated-output scan would not see it at all, because a
draft emits no page, so a contradiction introduced in a draft would sit
undetected until the day it was published. Scanning source catches it while it
is still cheap to fix.

The inconsistency between the two checks is intended. Each reads whichever
representation makes it hardest to miss the class of defect it exists for.

Why an explicit list and not number detection
---------------------------------------------
Generic number scanning would fire on prices, tin weights, dates, crocin
values, servings and delivery times, all of which legitimately differ between
posts. A check that fires on correct data gets switched off, so only figures
that are supposed to agree everywhere are tracked.

HOW TO ADD A FIGURE
-------------------
Append an entry to TRACKED. Each entry needs:
  name      what the figure is, used in the failure message
  accepted  the set of value strings that are correct
  patterns  regexes that capture the value where that figure is stated
Every capturing group in every pattern is compared against `accepted`. Write
one pattern per phrasing already in use, and prefer a slightly loose pattern
over a clever one. If a phrasing is not matched the check stays silent, which
is the safe direction; a wrong pattern that matches the wrong number is not.

Usage:  python tools/check_figures.py          (exit 1 on any conflict)
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
DATA = os.path.join(ROOT, "data", "site-data.json")

TRACKED = [
    {
        "name": "cultivated area, late 1990s",
        "accepted": {"5,707"},
        "patterns": [
            r"from\s+([\d,]+)\s+hectares\s+in\s+the\s+(?:late\s+)?1990s",
            r"down\s+from\s+([\d,]+)\s+in\s+the\s+late\s+1990s",
        ],
    },
    {
        "name": "cultivated area, 2025",
        "accepted": {"3,665"},
        "patterns": [
            # "... to about 3,665 as of 2025" / "... to 3,665 hectares as of 2025"
            r"hectares\s+in\s+the\s+(?:late\s+)?1990s\s+to\s+(?:about\s+|under\s+|over\s+)?([\d,]+)",
            r"to\s+(?:about\s+)?([\d,]+)\s*(?:hectares\s*)?as of 2025",
            r"grows saffron on about\s+([\d,]+)\s+hectares",
            r"Kashmir has about\s+([\d,]+)\s+hectares",
        ],
    },
    {
        "name": "yield, earlier",
        "accepted": {"2.5"},
        "patterns": [
            r"from\s+about\s+([\d.]+)\s+kg per hectare",
        ],
    },
    {
        "name": "yield, current range",
        "accepted": {"4.42", "5"},
        "patterns": [
            r"between\s+([\d.]+)\s+and\s+([\d.]+)\s+kg per hectare",
            r"between\s+([\d.]+)\s+to\s+([\d.]+)\s+kg per hectare",
        ],
    },
    {
        "name": "Iran's share of world saffron production",
        "accepted": {"85", "90"},
        "patterns": [
            r"Iran at\s+(\d+)\s+to\s+\d+\s+percent of world production",
            r"Iran at\s+\d+\s+to\s+(\d+)\s+percent of world production",
            r"Gonabad says over\s+(\d+)\s+percent",
        ],
    },
    {
        # The PDO's own floor, NOT the ISO 3632 Category I floor. The site states
        # the ISO figure as 190 or 200 and read-lab-report explains why sources
        # differ. Conflating the two is the defect this entry exists to catch, so
        # the patterns deliberately key on "colouring power", which is the PDO's
        # wording and appears nowhere else on the site.
        "name": "PDO Azafran de La Mancha colouring power floor",
        "accepted": {"200"},
        "patterns": [
            r"colouring power above\s+(\d+)",
            r"colouring power floor of\s+(\d+)",
        ],
    },
]


def walk(node, path, out):
    """Collect every string value with a dotted path to it."""
    if isinstance(node, dict):
        for k, v in node.items():
            key = str(k)
            # name posts by their id rather than their array index
            if isinstance(v, list) and key == "posts":
                for item in v:
                    ident = item.get("id", "?") if isinstance(item, dict) else "?"
                    walk(item, "posts[" + ident + "]", out)
                continue
            walk(v, path + "." + key, out)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, path + "[" + str(i) + "]", out)
    elif isinstance(node, str):
        out.append((path.lstrip("."), node))


def line_of(raw, needle):
    i = raw.find(needle)
    return raw.count("\n", 0, i) + 1 if i != -1 else 0


def main():
    raw = open(DATA, encoding="utf-8").read()
    strings = []
    walk(json.loads(raw), "", strings)

    problems = []
    seen = set()
    for fig in TRACKED:
        for path, text in strings:
            for pat in fig["patterns"]:
                for m in re.finditer(pat, text):
                    for value in m.groups():
                        if value in fig["accepted"]:
                            continue
                        # more than one pattern can legitimately match the same
                        # wrong number; report each distinct conflict once
                        key = (fig["name"], path, value)
                        if key in seen:
                            continue
                        seen.add(key)
                        snippet = text[max(0, m.start() - 45):m.end() + 25]
                        snippet = re.sub(r"\s+", " ", snippet).strip()
                        problems.append({
                            "figure": fig["name"],
                            "accepted": " or ".join(sorted(fig["accepted"])),
                            "found": value,
                            "path": path,
                            "line": line_of(raw, m.group(0)),
                            "snippet": snippet,
                        })

    print("checked %d tracked figures across %d strings in data/site-data.json"
          % (len(TRACKED), len(strings)))
    if not problems:
        print("OK  every tracked figure agrees everywhere it is stated")
        return 0

    print("")
    print("FAIL  %d conflicting value(s)" % len(problems))
    print("")
    for p in problems:
        print("  %s  (line %d)" % (p["path"], p["line"]))
        print("      figure:   %s" % p["figure"])
        print("      accepted: %s" % p["accepted"])
        print("      found:    %s" % p["found"])
        print("      ...%s..." % p["snippet"])
        print("")
    print("Two posts stating different values for the same figure is the defect")
    print("this exists to catch. Decide which value is right and correct the")
    print("other, rather than widening the accepted set to cover both.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
