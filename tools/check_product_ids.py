#!/usr/bin/env python3
"""Fail if a product's id does not match the last path segment of its own URL.

Why this exists
---------------
`sku` and `data-wa-product` are both emitted from `p.id`. Three of six ids had
drifted from the product they name: `royal-1g` on a 2g tin, `honey-250g` on a
500ml jar, `kahwa-50g` on a 100g tin. Nothing computed from those strings, so
nothing broke loudly; they simply published wrong values into Product schema and
into GA4 for months.

The ids are now the URL slug (scheme C), which makes them self-describing. This
check is what makes them self-verifying: a slug is derived from `baseName` and
`size`, so if either changes and the id is not updated, the id and the directory
name diverge and this fails.

It reads generated output rather than recomputing the slug, so it cannot drift
from the real slug logic in templates.js the way a reimplementation would.

Checks, per generated product page:
  - the Product JSON-LD `sku` equals the page's own directory name
  - every `data-wa-product` on that page equals the same
  - the canonical URL's last path segment equals the same

Usage:  python tools/check_product_ids.py          (exit 1 on any mismatch)
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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LD = re.compile(
    r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', re.S)
WA_PRODUCT = re.compile(r'data-wa-product="([^"]*)"')
CANONICAL = re.compile(r'<link[^>]+rel="canonical"[^>]+href="([^"]*)"')


def product_node(raw):
    for block in LD.findall(raw):
        try:
            obj = json.loads(block.strip())
        except ValueError:
            continue
        nodes = obj.get("@graph", [obj]) if isinstance(obj, dict) else obj
        for n in nodes:
            if isinstance(n, dict) and n.get("@type") == "Product":
                return n
    return None


def main():
    pages = sorted(glob.glob(os.path.join(ROOT, "products", "*", "index.html")))
    if not pages:
        print("FAIL  no generated product pages found under products/*/index.html")
        return 1

    problems = []
    for path in pages:
        slug = os.path.basename(os.path.dirname(path))
        rel = "products/" + slug + "/index.html"
        raw = open(path, encoding="utf-8").read()

        node = product_node(raw)
        if node is None:
            problems.append((rel, "no Product JSON-LD node found", "", ""))
            continue

        sku = node.get("sku", "")
        if sku != slug:
            problems.append((rel, "sku does not match the URL segment", sku, slug))

        for value in sorted(set(WA_PRODUCT.findall(raw))):
            if value != slug:
                problems.append((rel, "data-wa-product does not match the URL segment",
                                 value, slug))

        m = CANONICAL.search(raw)
        if m:
            last = m.group(1).rstrip("/").rsplit("/", 1)[-1]
            if last != slug:
                problems.append((rel, "canonical last segment does not match the directory",
                                 last, slug))

    print("checked " + str(len(pages)) + " product pages")
    if not problems:
        print("OK  every product id matches the last path segment of its URL")
        return 0

    print("")
    print("FAIL  " + str(len(problems)) + " product id mismatch(es)")
    print("")
    for rel, what, found, expected in problems:
        print("  " + rel)
        print("      " + what)
        print("      found:    " + (found or "(nothing)"))
        print("      expected: " + expected)
        print("")
    print("The id is the URL slug, built from baseName + size. If a product was")
    print("renamed or resized, update its id in data/site-data.json to match, and")
    print("note that this changes both its Product sku and its GA4 data-wa-product.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
