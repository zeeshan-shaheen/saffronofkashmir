# Project log

Decisions and defects from the work of 29 Aug to 5 Sep 2026, recorded so they do
not have to be rediscovered.

Reference, not narrative. Every claim here was checked against the repository or
against live HTTP before it was written. Anything that could not be verified
from the repo is marked or absent. Where this file and the code disagree, the
code wins and this file is wrong.

Companion documents: `CLAUDE.md` for the rules that bind changes,
`docs/infrastructure.md` for configuration that exists only in dashboards.

---

## 1. What was done

Commit ranges are on `main`. Use `git log --reverse --oneline --since=2026-08-29`
to see the full sequence.

### Phase 1: metadata, and the bug underneath it

`85c8e8b`

`templates.js` ended a concatenation with `+ +`. The second plus applied to the
following string and coerced it to `NaN`, so every WhatsApp order button shipped
`NaNcard` or `NaNdetail` where `data-wa-pos` should have been. `main.js` falls
back to `other` when the attribute is missing, so GA4 recorded no click position
on the highest-intent CTAs and the markup was invalid. 15 buttons at the time of
the fix.

Also corrected: recipe copy promising six recipes when four exist, stated in the
meta description, the `og:description` and the visible subheading, and naming two
recipes not in the data. Page titles trimmed under 60 characters.
`metaDescription` added to `pampore-legacy` and `purity-tests`, whose excerpts
ran to 208 and 194 characters.

**Cost:** the `NaN` shipped to production and sat there. `node --check` accepts
`x + + y`, `JSON.parse` never saw it, and the CI output-drift check could not
distinguish it from an intended change. Four separate guards were green
throughout. That finding is section 2.

### Phase 2: infrastructure

Configuration only, no repo change. Recorded in `docs/infrastructure.md`.

- **SSL/TLS was Flexible until 31 Aug 2026.** Three faults at once: all 19
  directory-style URLs answered `301` with a plaintext `http://` `Location`, so
  every no-slash inbound link took two hops through cleartext; Cloudflare to
  origin was unencrypted; GitHub Pages could not provision a certificate at all.
  Now Full (Strict).
- **The GitHub Pages certificate covers the apex only.** `www` is a `CNAME` to
  the apex, so under Full (Strict) a `www` request reaching the origin returns
  **526**. The `www-to-apex` redirect runs at the edge before any origin fetch,
  which is why it must stay.
- **Trailing-slash and `.html` duplicates.** Both address shapes resolved,
  splitting signals across two URLs per page. Now `301`ed to one form each.
- **Five wildcard redirect rules were Active and had never fired usefully.**
  They matched on the full URI including hostname rather than on path; the
  `index` rule matched `http://` only, so it stopped firing entirely once HTTPS
  was enforced; between them they left four `.html` paths uncovered. Disabled,
  not deleted.
- **Query strings were being dropped** by `www-to-apex` and
  `html-to-extensionless`. Cloudflare's "Preserve query string" checkbox has no
  effect when the target is a fully-specified dynamic expression; the query has
  to be in the expression. `html-to-extensionless` is now two rules split on
  whether a query exists, because `regex_replace` needs a Business plan.

**Cost:** eight regression tests now exist for the redirect set, in
`docs/infrastructure.md`. Run all eight after any rule change.

### Phase 2: repository

`448e571`, `8e8fee5`

- **Three of six product ids named the wrong product.** `royal-1g` sat on a 2g
  tin, `honey-250g` on a 500ml jar, `kahwa-50g` on a 100g tin. Both the Product
  `sku` and the GA4 `data-wa-product` attribute are emitted from `p.id`, so each
  wrong id published a wrong value in two places. Nothing computed from those
  strings, so nothing failed. All six ids are now the last path segment of their
  own URL. No URL moved.
- **The ISO 3632 claim was rewritten** to "Lab tested to ISO 3632 Category I",
  never the bare grade.
- **The purity guarantee was introduced** as a data field with a stated remedy.
- **Harvest year became a single field**, `brand.harvestYear`, currently `2025`.

**Cost:** `data-wa-product` changed for all six products. GA4 `whatsapp_click`
history keyed on the old ids does not join to the new ones, and any report
spanning the change shows each product as two items. Existing rows were not
rewritten. `tools/check_product_ids.py` now fails the build if an id drifts from
its URL again.

### Phase 3: the blog

`8f14293`, `5345943`, `8617d42`, `29af054`, `c4eca3e`, `73b8860`

- **A hectare contradiction.** `pampore-legacy` claimed the growing area fell
  below 2,500 hectares by 2010 while four other posts said 5,707 falling to
  3,665 as of 2025, on a site whose argument is that other people's figures do
  not add up.
- **Internal link equity was flowing to the weakest pages.** "More from the
  blog" was `slice(0, 4)` on data-file order, so all thirteen posts linked to
  the same four oldest posts. Replaced with a curated `related` list per post,
  falling back to same category then newest first.
- **Heading levels.** `## ` in post bodies emitted `h3`, so every post jumped
  `h1` to `h3` and the only `h2` belonged to a sidebar. Now `h2`.
- **Two merges.** `mongra-grade` into `grade-names`, `five-fakes` into
  `purity-tests`. Live posts 13 to 11.

**Cost:** two live URLs retired, each needing a Cloudflare redirect added *after*
the page 404ed, in that order. `tools/check_figures.py` and
`tools/check_related.py` were written in this phase and now fail the build on a
recurrence of either defect.

### Phase 4: schema and content (partial)

`9b6f310`, `389b3a7`, `b6dddde`, `f25434f`, `cb7b2a6`, `326b8d8`, `322fd57`

- **Organization contact points understated the service area.** Now three
  `contactPoint` entries: the Gulf as `["AE","SA","QA","OM","KW","BH"]`, `IN`,
  and "Worldwide, excluding the European Union and the United Kingdom".
- **The purity guarantee contradicted the returns policy** on window, remedy and
  coverage. Reconciled: the guarantee is 90 days, opened or unopened, refund
  including the cost of the test; the returns policy is 7 days, unopened.
- **Merchant fields added to Product** and a `ProductGroup` for the three tins,
  with `variesBy` size.
- **Four posts written or extended.** `storing-saffron` extended by 807 words;
  `powder-or-threads`, `origins-compared` and `health-claims` new. Live posts 11
  to 14, 15 including the `harvest-diary-2026` draft.

**Cost:** two new `TRACKED` figures, both proven failing for the reason they
exist before being trusted. `tools/check_figures.py` now tracks six.

**Not done:** the three tin product pages. Blocked, see section 4.

---

## 2. The pattern

Seven verification artifacts were found reporting success while measuring
nothing. This is a property of how the repository was built, not a run of bad
luck: each was added, observed green once, and trusted thereafter.

| artifact | what it actually measured |
|---|---|
| `node --check` | syntax. `x + + y` is valid JavaScript, so the `NaN` bug passed |
| the parity script | the first changed block only, so it reported the same DIFF count in two different states and hid a real body-copy change |
| a required status check | a context nothing reports. It gated nothing, in either direction, for three weeks |
| the parity baseline write-guard | a path comparison that failed on drive-letter case, so it permitted the write it exists to block |
| the JSON-LD listing in `CLAUDE.md` | 3 blocks, while the script people ran checked 27 |
| a `BlogPosting` `@type` test | nothing. The JSON-LD is a single `@graph`, so a top-level `@type` test matches no node and reports clean on every page |
| five Cloudflare redirect rules | Active for months. One matched `http://` only and stopped firing when HTTPS was enforced |

Two rules in `CLAUDE.md` came out of this.

**Rule 8:** no verification guard is trusted until it has been observed failing
for the reason it exists. Break the thing it watches, confirm it fails and names
the fault, restore, confirm it passes. It also carries the corollary: any check
that verifies presence must assert a non-zero match count before reporting
success. "Found zero problems" and "found zero things to examine" must not
produce the same output.

**Rule 9:** no executable lives in documentation. Both script listings that were
embedded in `CLAUDE.md` drifted from the versions actually being run. Everything
runnable is in `tools/`.

Five of the six scripts in `tools/` still lack the non-zero assertion. See
section 4, item 2.

---

## 3. Decisions

Recorded because a future session would otherwise reopen them.

**Market priority is UAE first, India second, rest of world third.** hreflang and
country-specific pages were judged premature at current volume. Revisit only if
per-country traffic justifies maintaining parallel page sets.

**INR is a separate price, not a conversion of AED.** `brand.currencies.INR`
carries `markup: -50`, and the displayed price is `aed * rate * (1 + markup/100)`.
India is priced at roughly half the AED price converted. **A Merchant Center feed
built by converting AED will be wrong for India by a factor of two.** Country
pricing has to come from the INR figure the site actually shows.

**Product JSON-LD carries AED only.** Verified: `AED` is the only
`priceCurrency` across all six product pages. Do not add a second Offer in INR.
Nothing on the page binds a currency to a country, so a second Offer gives Google
no basis to choose. The supported routes are a Merchant Center feed with
per-country pricing, or country-specific URLs, neither of which exists.

**The purity guarantee and the returns policy are different instruments.**
`hasMerchantReturnPolicy` encodes the **returns policy**: 7 days, unopened,
`MerchantReturnFiniteReturnWindow`, linking to `/returns-policy`. The guarantee
is 90 days, opened or unopened, refund including the cost of the test. Do not
encode the guarantee as a return policy; they differ on window, remedy and
coverage.

**`addressCountry` stays `IN`.** The saffron is grown and dispatched from
Pampore. The Gulf is a service area, expressed through `contactPoint`
`areaServed`, not through the postal address.

**`dateModified` is a factual claim about the document, not a sort key.**
Suppressing it to improve a post's index position makes the schema less true to
make the index look better. `livePosts()` currently sorts on
`dateModified || dateISO`, which is the wrong sort key; that is a separate fix,
section 4 item 3. It is not a reason to stop setting the field.

**"What the research says about saffron" was refused.** Grounds: the regulatory
exposure of publishing research summaries on the domain selling the product; the
constraints that would make it safe also strip out what would make it rank or
convert; the site's own terms page states the opposite commitment; the search
intent belongs to supplement buyers; and it contradicts the pattern that every
other post earns trust by refusing claims a document cannot back.

One of the five arguments did not survive checking. The claim that the Drugs and
Magic Remedies (Objectionable Advertisements) Act 1954 bites specifically on
depression and cognition was overstated: its Schedule contains no such entry.
The refusal stands on the other four. `health-claims` was written instead, and
that Act is deliberately not cited in it, because its definition of "drug" carves
food out of the structure-and-function limb, its Schedule is flagged as under
review in the only reachable text, and the authoritative text could not be
retrieved.

**The ISO 3632 claim is "lab tested to", never the bare grade.** Category I is a
band, not a score. The site states the measured figures and the laboratory, not
the category alone.

**Harvest year is one field.** `brand.harvestYear`, currently `2025`. Change it
in one place when stock turns over.

---

## 4. Open queue

Priority order. Each is its own PR.

1. **`.gitattributes` set to `* text=auto eol=lf`.** Four CRLF incidents during
   this work, every one caught by an assertion rather than prevented, including
   one partial write to `data/site-data.json` that had to be reverted. Currently
   `* text=auto` plus `core.autocrlf=true` means git checks files out CRLF while
   `build.js` writes LF, so every generated file looks modified after a rebuild.

2. **Guard audit: non-zero assertions.** Only `tools/check_product_ids.py`
   asserts a non-zero corpus (`if not pages: FAIL; return 1`). The other five
   exit 0 on an empty input. `check_figures.py` needs the corpus-level versus
   phrasing-level distinction rather than a blanket patch: zero matches across
   the whole corpus means the patterns are broken and must fail; zero matches for
   one phrasing means someone wrote a sentence differently and must stay silent.

3. **Blog index ordering.** `dateModified` has twice proven to be the wrong sort
   key, because editing an old post promotes it above newer ones. Likely answer
   is a curated order with a check, the same pattern as the related widget.

4. **`arabic-cuisine` and `pampore-legacy`.** 160 and 240 words, thin by the
   project's own standard, with almost no inbound links. Decide: extend, merge or
   retire. Until then do not take `arabic-cuisine`'s last inbound `related` slot,
   which is `how-much-to-use`.

5. **Body-level internal linking.** Eight of eleven posts had zero inbound body
   links before this work. Report the current figure and treat it as its own
   pass; `related` should not be carrying all internal linking.

6. **A dedicated guarantee page.** Currently inside an FAQ accordion, and it is
   the strongest trust asset on the site. It is also where the lab report goes in
   October 2026.

7. **`dateDisplay` formatted from `dateISO`** rather than stored as a separate
   field on every post, where the two can disagree.

8. **The 12-month aroma window against the 36-month sealed figure.**
   `storing-saffron` says use within 12 months of harvest for full aroma; the
   product specs say 36 months sealed. No page reconciles them.

**Blocked, not queued: the three tin product pages.** Rewritten copy is agreed
in outline and cannot be written until a measured threads-per-gram figure exists.
Every serving figure on those pages derives from it. Do not touch product entries
in `data/site-data.json` until it arrives.

Also outstanding and unfixed: the comment above `bodyToHtml` in
`assets/admin/templates.js` still says `## ` becomes `<h3>`. The code emits
`<h2>`.

---

## 5. What is not in version control

**Every redirect on this site is a Cloudflare rule applied by hand in the
dashboard.** GitHub Pages has no redirect mechanism: no `_redirects`, no
`.htaccess`, no config file. `docs/infrastructure.md` is the only record.

Retiring a page therefore takes two actions in order: merge the commit that
removes the page and confirm the URL returns `404`, then add the redirect rule.
Adding the rule first leaves it competing with a page that still exists. Deleting
a post from `data/site-data.json` is not enough on its own, because the build
writes pages but never removes retired ones.

`docs/infrastructure.md` still carries six items that could not be read and were
supplied rather than verified. No Cloudflare API credential is available in the
working environment.

1. That SSL/TLS mode is literally set to Full (Strict).
2. The exact expression, action, target, status code and query-string setting of
   each active rule.
3. The order the rules appear in.
4. The five disabled rules: that they exist, their names, their expressions, and
   that they are disabled rather than deleted.
5. The full DNS record list, and which records are proxied against DNS only,
   beyond the apex and `www` confirmed by resolution.
6. The `TXT`, SPF and DKIM records for Zoho and MailerLite.

Correct any of them in place once checked. A reference that is trusted and wrong
is worse than no reference.
