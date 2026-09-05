#!/usr/bin/env python3
"""Fail when the purity checker's question tree makes a claim the site does not.

Why this exists
---------------
The checker returns a verdict about a product the reader already owns. A verdict
reads as more authoritative than a paragraph, so the claim standard in CLAUDE.md
binds it harder than it binds prose. The failure mode is silent: someone edits
purity-tests, the checker keeps saying the old thing, and one page contradicts
itself while every other check stays green.

Parity cannot catch it either. Parity compares visible text against a baseline,
so a checker string and a post paragraph drifting apart both look like intended
edits.

How a claim is anchored
-----------------------
Every option, note and cannotSee entry carries an `anchor`: a substring that must
appear verbatim in the body of a live post. By default that is the post the
checker sits in; `anchorPost` overrides it when the claim belongs to another post
(aroma comes from storing-saffron, blending from arithmetic-of-origin).

That makes "consistent with the body" a mechanical test rather than a judgement.
Rewrite the sentence in the post and this check fails until the checker is
updated to match, which is the point.

Non-zero assertion
------------------
Per hard rule 8, this reports how many checkers, questions and options it
examined, and fails when it finds no checker at all. "Found zero problems" and
"found zero things to examine" must not produce the same output. The corpus here
is the set of checker definitions: zero means the feature is gone or the key was
renamed, and the check would otherwise pass while verifying nothing.

Usage:  python tools/check_checker.py          (exit 1 on any violation)
"""
import io
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

# The three outcomes the checker is allowed to express. A numeric score is the
# design defect this list exists to prevent, so a number in this field is a
# violation even when it would compare equal to a permitted string.
SIGNALS = ("indicator", "nothing", "inconclusive")

OUTCOME_KEYS = ("indicator", "nothing", "inconclusive")


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def line_of(raw, needle):
    i = raw.find(needle)
    return raw.count("\n", 0, i) + 1 if i >= 0 else 0


def main():
    raw = io.open(DATA, encoding="utf-8").read()
    data = json.loads(raw)
    posts = data.get("posts", [])

    if not posts:
        print("FAIL  no posts in data/site-data.json")
        return 1

    bodies = {p.get("id"): norm(p.get("body")) for p in posts}
    live = {p.get("id") for p in posts if not p.get("draft")}

    problems = []
    n_checkers = n_questions = n_options = n_anchors = 0

    def anchored(where, text, anchor, host):
        """Record a problem unless `anchor` appears verbatim in a live post."""
        nonlocal n_anchors
        target = host
        if isinstance(anchor, dict):
            target = anchor.get("anchorPost") or host
            anchor = anchor.get("anchor")
        if not norm(text):
            problems.append((where, "empty text"))
            return
        if not norm(anchor):
            problems.append((where, "no anchor: every claim must name a "
                                    "sentence in a post that already makes it"))
            return
        if target not in bodies:
            problems.append((where, "anchorPost %r does not exist" % target))
            return
        if target not in live:
            problems.append((where, "anchorPost %r is a draft and emits no page"
                             % target))
            return
        n_anchors += 1
        if norm(anchor) not in bodies[target]:
            problems.append((where, "anchor not found in %s: %r"
                             % (target, norm(anchor)[:70])))

    for post in posts:
        checker = post.get("checker")
        if not checker:
            continue
        host = post.get("id", "?")
        n_checkers += 1

        if post.get("draft"):
            problems.append(("posts[%s].checker" % host,
                             "sits on a draft, so it emits no page"))

        # Placement. renderPostPage splits the body on this heading to decide
        # where the checker goes. If it stops matching, the checker silently
        # renders at the end of the post instead of where it was placed.
        after = checker.get("afterSection")
        if not norm(after):
            problems.append(("posts[%s].checker.afterSection" % host,
                             "missing: the renderer needs a heading to place "
                             "the checker after"))
        elif ("## " + norm(after)) not in norm(post.get("body")):
            problems.append(("posts[%s].checker.afterSection" % host,
                             "no section headed %r in the post body" % norm(after)))

        questions = checker.get("questions") or []
        if not questions:
            problems.append(("posts[%s].checker.questions" % host,
                             "empty: a checker with no questions examines nothing"))
        seen_ids = set()
        for qi, q in enumerate(questions):
            n_questions += 1
            where_q = "posts[%s].checker.questions[%d]" % (host, qi)
            qid = q.get("id")
            if not norm(qid):
                problems.append((where_q, "no id"))
            elif qid in seen_ids:
                problems.append((where_q, "duplicate id %r" % qid))
            else:
                seen_ids.add(qid)
            if not norm(q.get("prompt")):
                problems.append((where_q, "empty prompt"))

            options = q.get("options") or []
            if len(options) < 2:
                problems.append((where_q, "fewer than two options"))
            for oi, o in enumerate(options):
                n_options += 1
                where_o = "%s.options[%d]" % (where_q, oi)
                if not norm(o.get("label")):
                    problems.append((where_o, "empty label"))

                because = o.get("because")
                if not norm(because):
                    problems.append((where_o, "empty because: every option must "
                                              "show its own reasoning"))

                signal = o.get("signal")
                if isinstance(signal, bool) or isinstance(signal, (int, float)):
                    problems.append((where_o, "signal is a number (%r). The "
                                     "checker states an outcome, never a score"
                                     % signal))
                elif signal not in SIGNALS:
                    problems.append((where_o, "signal %r is not one of %s"
                                     % (signal, ", ".join(SIGNALS))))

                anchored(where_o, because, o, host)

        for key in ("notes", "cannotSee"):
            entries = checker.get(key) or []
            if key == "cannotSee" and not entries:
                problems.append(("posts[%s].checker.cannotSee" % host,
                                 "empty: the list of what home testing cannot "
                                 "detect is the point of the feature"))
            for ei, e in enumerate(entries):
                anchored("posts[%s].checker.%s[%d]" % (host, key, ei),
                         e.get("text"), e, host)

        outcomes = checker.get("outcomes") or {}
        for k in OUTCOME_KEYS:
            oc = outcomes.get(k)
            if not oc:
                problems.append(("posts[%s].checker.outcomes.%s" % (host, k),
                                 "missing"))
                continue
            for field in ("heading", "body"):
                if not norm(oc.get(field)):
                    problems.append(("posts[%s].checker.outcomes.%s" % (host, k),
                                     "empty %s" % field))
        for k in outcomes:
            if k not in OUTCOME_KEYS:
                problems.append(("posts[%s].checker.outcomes.%s" % (host, k),
                                 "unexpected outcome, only %s are permitted"
                                 % ", ".join(OUTCOME_KEYS)))

    print("checked %d checker(s), %d question(s), %d option(s), %d anchored claim(s)"
          % (n_checkers, n_questions, n_options, n_anchors))

    if not n_checkers:
        print("")
        print("FAIL  no checker found in data/site-data.json")
        print("")
        print("Nothing was examined. If the feature was removed on purpose,")
        print("remove this check in the same commit and take it out of")
        print("build-check.yml. A guard for a feature that no longer exists")
        print("passes forever and protects nothing.")
        return 1

    if not problems:
        print("OK  every checker claim is anchored to a sentence in a live post")
        return 0

    print("")
    print("FAIL  %d violation(s)" % len(problems))
    print("")
    for where, why in problems:
        print("  %s" % where)
        print("      %s" % why)
        print("")
    print("Every claim the checker makes must already be published on this site.")
    print("If a post was reworded, update the checker to match rather than")
    print("loosening the anchor. If the claim is new, it belongs in the post")
    print("first, where it can be read in context.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
