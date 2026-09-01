#!/usr/bin/env python3
"""Fail when a post's curated `related` list points somewhere invalid.

Why this exists
---------------
"More from the blog" used to be slice(0, 4) on data-file order, so all thirteen
posts linked to the same four oldest posts and the nine substantial ones had a
single internal link each. It is now a curated list per post.

Curation's failure mode is drift: a post is retired or renamed and the
references to it are left dangling. This converts that into a build failure, so
retiring a post forces its references to be updated in the same commit rather
than relying on a redirect to cover them.

It scans data/site-data.json rather than generated output, for the same reason
as tools/check_figures.py: the harvest-diary draft carries a curated list and
emits no page, so a bad reference there would be invisible to an output scan
until the day it published.

Enforces VALIDITY, not PRESENCE. A post with no `related` list is fine; the
template falls back to same-category then newest-first. Requiring a list would
make adding a post harder for no gain, since the fallback is already better
than what it replaced.

Rules:
  - every id in `related` resolves to a post that exists
  - no post lists itself
  - no reference points at a draft, which emits no page

Usage:  python tools/check_related.py          (exit 1 on any violation)
"""
import json
import os
import sys

try:  # page copy contains emoji; a cp1252 console would crash mid-report
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "site-data.json")


def line_of(raw, needle):
    i = raw.find(needle)
    return raw.count("\n", 0, i) + 1 if i != -1 else 0


def main():
    raw = open(DATA, encoding="utf-8").read()
    posts = json.loads(raw).get("posts", [])

    all_ids = set()
    draft_ids = set()
    for p in posts:
        pid = p.get("id")
        if not pid:
            continue
        all_ids.add(pid)
        if p.get("draft"):
            draft_ids.add(pid)

    problems = []
    curated = 0
    refs = 0
    for p in posts:
        pid = p.get("id", "?")
        rel = p.get("related")
        if not rel:
            continue
        curated += 1
        line = line_of(raw, '"id": "%s",' % pid)
        for ref in rel:
            refs += 1
            if ref == pid:
                problems.append((pid, line, ref, "post lists itself"))
            elif ref not in all_ids:
                problems.append((pid, line, ref,
                                 "no post with this id exists"))
            elif ref in draft_ids:
                problems.append((pid, line, ref,
                                 "points at a draft, which emits no page"))

    print("checked %d curated list(s), %d reference(s), across %d posts"
          % (curated, refs, len(posts)))
    if not problems:
        print("OK  every related reference resolves to a live post")
        return 0

    print("")
    print("FAIL  %d invalid reference(s)" % len(problems))
    print("")
    for pid, line, ref, why in problems:
        print("  posts[%s].related  (line %d)" % (pid, line))
        print("      reference: %s" % ref)
        print("      problem:   %s" % why)
        print("")
    print("If a post was retired, update every list that referenced it rather")
    print("than relying on a redirect. A redirect does not fix an internal link.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
