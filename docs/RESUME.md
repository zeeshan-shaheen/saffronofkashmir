# Resume — saffronofkashmir.com
Last updated: 29 August 2026

## Repo facts
Generated site: data/site-data.json -> assets/admin/templates.js ->
build.js -> 14 output files. NEVER edit generated .html.
Hosting: GitHub Pages behind Cloudflare. NOT Cloudflare Pages.
No _redirects file. Redirects and headers are set in the Cloudflare
dashboard.
Publishing: the admin panel at /admin is the primary route.
Node v26.3.0, zero dependencies.

## Business model and standing constraints
Read this section before touching any copy.

- The selling entity is India-registered. The saffron is grown,
  harvested and packed in Pampore, Jammu and Kashmir, from the
  family's own fields. That is the only sourcing story. Do not
  reintroduce any wording about buying from other Pampore farming
  families; it describes a different business.
- **No per-parcel dispatch-origin claim appears anywhere on the site,
  and that is deliberate.** Not in copy, not in a meta description,
  not in JSON-LD. Parcels do not all leave from one place, so
  "ships from India" on every order would be untrue. Saying nothing
  is accurate. A future session must not "helpfully" add an origin
  sentence back. The previous version claimed stock was held and
  dispatched from Dubai; that was false and is gone.
- **Origin is not registration location.** The saffron's origin is
  Pampore and is published. The business registration location is
  NOT published. Never write copy that lets one be read as the
  other. footer.locationLine ("Pampore, J&K, India") was removed on
  28 Aug 2026 for exactly this reason: it sat beside the FSSAI
  number in the footer bottom and the two read together as a
  registered business address.
- **Not published, deliberately:** brand.legalName and
  brand.registeredAddress were removed from site-data.json and are
  absent from JSON-LD. Organization.name stays "Saffron of Kashmir"
  as a trading name. There is no legalName property in the schema.
  Do not reintroduce either field. Organization.address stays the
  minimal { addressCountry: 'IN', addressRegion: 'Jammu & Kashmir' }
  with no street, locality or postal code.
- **FSSAI:** basic registration 21026111000535, verified against the
  certificate by the owner 28 Aug 2026. Renders as footer text only,
  as "FSSAI Registration No. 21026111000535". The word is
  Registration, not Licence. It is NOT in JSON-LD and must not be:
  no schema.org property means "FSSAI registration", so there is
  nowhere correct to put it. Blank the brand.fssaiNumber field and
  the whole footer segment disappears rather than leaving a label.
- No copy claims export authorisation, a Central licence, or that
  the business is registered in Pampore. Swept 28 Aug 2026, zero
  hits.

## Delivery copy as it now stands
- India: 3-5 business days, free over INR 4000.
- UAE and Middle East: 4-6 days in transit.
- Rest of world: 4-6 days in transit.
- International cards carry "Customs clearance times vary by country
  and are outside our control." The FAQ separately says customs
  duties and import charges are payable by the recipient.
- The 48-hour UAE delivery promise, the AED 120 and USD 120 free
  delivery thresholds, and all Dubai fulfilment wording are gone.
- **The 4-6 day figures are owner-supplied and unmeasured.** Correct
  them after the first real international shipment.

## WhatsApp routing
- Two numbers: India 917006603060, UAE and Middle East 971522613060.
  Both are admin-editable as brand.whatsappIndia and
  brand.whatsappUae, and both render in the served HTML. No cloaking.
- **UAE_COUNTRIES = AE, SA, QA, OM, KW, BH routes to the UAE number.
  Everything else, including GB and US, routes to India.** That one
  list at main.js:212 drives routing, the timezone fallback and the
  currency override, so the three cannot drift apart. An earlier
  version had ipapi and the timezone fallback disagreeing about GB.
- The static href in the HTML is always the India number, so order
  buttons work with JavaScript disabled. templates.js waAttrs()
  emits href plus data-wa-in and data-wa-ae; main.js swaps the href.
- Country cached in localStorage as sok_country beside sok_currency.
  One ipapi call serves both. On fetch failure or a 3 second timeout
  it falls back to Intl.DateTimeFormat().resolvedOptions().timeZone.
  This also fixed the currency switcher's previously silent failure
  past ipapi's 1000/day cap.
- The #sok-curr select doubles as the manual override. No second UI.
- **Routing is independent of #sok-curr being present.** That is what
  makes it work on 404, which has no nav and therefore no select. Do
  not reintroduce an early return on a missing select.
- The four per-market links in the footer and contact strip are left
  unrouted on purpose and each carries a visible market label, so
  nobody messages the wrong line by accident.

## The SOK_ATTR trap
Rewriting a wa.me href wipes the order-attribution "Ref:" code,
because the data-wa-in and data-wa-ae attributes carry the plain URL
and SOK_ATTR stamps the href earlier in the file. Routing therefore
re-stamps by calling SOK_ATTR.stampAll(attr.ref) immediately after
the swap. **Any future code that touches those hrefs must do the
same**, or every routed order silently loses its attribution and
nothing visibly breaks.

## Shipped and live
- gitignore, gitattributes, nojekyll; _archive/ untracked and moved
  off-repo (files at d:\SOK git clone\_archive-saffronofkashmir\)
- Claims cleanup: ISO 3632 "Grade A" -> "Category I" (22 strings,
  zero "Grade A" remain); crocin spec corrected to 203.48; "every
  batch tested" -> single independent test with IIKSTC named;
  founding year 2004 removed
- 700-year heritage claim removed from all three locations
  (posts[1].title, story.paragraphs[0], seo.blog.description),
  10 Aug 2026. Replaced with undated wording.
- 90% of India's saffron figure reattributed to Kashmir rather than
  Pampore in all three locations (story.paragraphs[0],
  posts[1].excerpt, faq.items[6].a), 10 Aug 2026.
- India entity migration, 28 Aug 2026. UAE fulfilment claims removed,
  sourcing contradiction fixed, dual WhatsApp routing added, FSSAI
  footer line added. PR #6, merged to main, deployed and verified in
  production.
- Story copy now states both facts plainly: the family has farmed
  saffron in Pampore for three generations, and Saffron of Kashmir
  was founded in 2026. brand.foundingYear 2026 also renders as
  JSON-LD foundingDate. No copy implies the brand itself is older.
- **404 now calls footer(data, '404').** It previously had no footer
  at all: no navigation, no contact details, no copyright, no FSSAI
  line, no WhatsApp links. It went from 794 bytes to ~11.5 KB.
  Verified live: a nonexistent path returns HTTP 404 with the full
  footer and keeps its noindex.
- Organization contactPoint carries areaServed built from the same
  UAE_COUNTRIES list main.js routes on. UAE line is
  contactType "customer support", India is "sales".
- First-visit overlay restricted, 10 Aug 2026: homepage only
  (enforced at build time, markup absent from the other 11 outputs),
  desktop only via matchMedia at trigger time, 15 second timer, no
  scroll trigger. delayMs, minViewportWidth and homepageOnly live in
  the overlay object. This closed what was Step 8.
- Extensionless URLs: root-relative internal links, canonicals,
  og:url, sitemap. pageUrl() and asset() helpers.
- Cloudflare Bulk Redirects: 5 x 301 from old .html URLs. Verified.
- Social: 7 platforms in footer, sameAs, social_click GA4 event.
- CI: .github/workflows/build-check.yml runs
  `git add -A && git diff --cached --exit-code` on push and PR.
- Ruleset on main: restrict deletions, block force pushes, require
  "Build check". Repository admin is on the bypass list, which is
  what lets the panel publish.
- Atomic publish via Git Data API (blob -> tree -> commit -> ref).
  Legacy per-file Contents API path retained, switchable in
  Settings > Publish method.
- Build determinism: sitemap lastmod reads meta.lastPublished;
  footer copyright is a static constant; privacy policy date reads
  seo.privacyLastUpdated. No new Date() affects build output.
- Order attribution: live and verified on a real phone 10 Aug 2026.
  First-touch source in localStorage as sok_attr {src, landing, ts,
  ref}. Ref format SRC-XXXX, crypto random, alphabet excludes
  0 O 1 I L. Appended to every wa.me link that carries a ?text=
  message. Contact-strip links without a message are skipped.
  whatsapp_click GA4 event carries ref, src, product, page_path,
  position and wa_number.
- Image provenance: 15 root .webp files confirmed as the owner's own
  photography, 9 Aug 2026.
- Cloudflare Managed robots.txt disabled, 10 Aug 2026. Live
  robots.txt is the repo file only, hand-maintained, not generated
  by build.js.
- Content-Signal: search=yes,ai-input=yes,ai-train=no in robots.txt
  with an explanatory preamble. Declaration only, not enforced.

## Next session
1. Cloudflare cache rules still not taking effect on /assets/js/,
   /assets/css/ or /assets/admin/. Check the rule expression and
   ordering. Workaround in place: test in a private window.
2. Correct the 4-6 day transit figures once a real international
   shipment has been timed.
3. Then let order attribution run ~1 month before Step 12.

## Not started
- Step 6: og:image -> JPEG; og:type product on detail pages; product
  ids ship as schema.org sku and three contradict the product
  (royal-1g is 2g, honey-250g is 500ml, kahwa-50g is 100g).
  templates.js:931 hardcodes p.id === 'royal-1g' for the blog
  sidebar - must change together.
- Step 7: currency switcher misses several locations (compare table,
  per-gram spec rows, related-products list, hero CTA, blog sidebar
  fallback, product meta description). Prose AED amounts in
  site-data.json can never convert.
- Step 10: CLAUDE.md rewrite, PARTIALLY DONE 28 Aug 2026. The
  repository layout now shows product subpages and the 14-file
  count, and the verification section now states correctly that the
  two scripts are not in the repo. Still stale: the schema reference
  section and the templates.js function table, which predate
  waAttrs(), waNumbers() and the current product field names
  (baseName/size, not name).
- Step 12: SEO and competitor analysis. Do after attribution has
  produced data. Expect it to reopen URL structure, blog
  architecture (posts live at /blogs#id inside <details> with
  BlogPosting JSON-LD pointing at fragments), and product page depth.

## Carried forward - unresolved
- **Testimonials: two remain, provenance unconfirmed.** The
  "Ordered at 9pm, arrived next day" testimonial was removed 28 Aug
  2026 because it promised next-day delivery, contradicting the
  4-6 day transit copy. The two survivors (Ashraf - Dubai, Rajesh
  Nair - Sharjah) make no delivery claim. Both were added in the
  initial bulk upload 8ee9734 on 12 Jun 2026 and nothing in the repo
  distinguishes real from placeholder.
  **No ref-code mapping is possible for them.** Ref codes are
  generated in the visitor's browser and stored only in their
  localStorage; there is no server and no database. Attribution
  shipped 10 Aug 2026, two months after these testimonials were
  written, so no ref ever existed for either customer. Any mapping
  would be invented. Future testimonials can be mapped, because new
  order messages carry a ref.
- covercgpt-1.webp: "EST. 2004" burnt into the artwork, filename
  reads as an AI tool name, serves as og:image on four pages. One
  re-export fixes both: new JPEG, new filename, no 2004.
- Trade licence not filed in evidence/. The FSSAI registration
  number is now published in the footer and verified.
- Lab report issued under the owner's other food company.
- No consent gate for GA, Meta Pixel or the sok_attr identifier.
- brand.whatsappNumbers[0].market reads "UAE & Middle East" with no
  orders/enquiries distinction, although routing treats that line as
  support. One admin field edit if wanted.
- Confirm 2026 is the correct registration year for foundingDate.

## Accepted risks - do not re-litigate
- Admin panel is publicly reachable at /admin and /admin.html.
  GitHub PAT stored plaintext in localStorage on the same origin as
  public pages that load Meta Pixel and GTM. Any XSS on the origin
  yields repo write plus CI code execution via workflows:write.
  Owner accepted 9 Aug 2026. The fix is recoverable:
  git checkout -b security/admin-offline 2f57ca4
- Token permissions are broader than needed. Owner accepted.
- CI is advisory, not blocking, because Repository admin bypasses
  the ruleset. A red check does not stop a publish - Actions must be
  checked manually after publishing.
- 30 commits in history carry a Co-Authored-By trailer, and three
  April 2026 commit subjects name an assistant. Left in place
  deliberately: removing them requires rewriting every SHA, which
  invalidates the restore points cited in this file. Not visible on
  the live site. CLAUDE.md now forbids the trailer going forward.

## Known limitations
- **main.js is still served max-age=14400.** The Cloudflare cache
  rule is created but ineffective on /assets/js/, /assets/css/ and
  /assets/admin/, verified on a fresh MISS for style.css so it is
  not a stale object. Returning visitors keep the old script for up
  to 4 hours, which means new HTML can pair with old JS. Test JS and
  CSS changes in a private window or an unused browser;
  Ctrl+Shift+R on /admin after a panel change. Two false "broken
  feature" diagnoses have already come from this.
- Verification scripts _parity_check.py and _check_jsonld.py live in
  the working scratch directory, OUTSIDE the repo, and are not
  committed. .nojekyll publishes underscore-prefixed directories, so
  a _parity_baseline/ at repo root would ship plain-text duplicate
  copies of every page, which CLAUDE.md forbids. Both listings are
  preserved in CLAUDE.md so they can be recreated.
  **Parity must be baselined BEFORE editing, from a clean tree.** A
  baseline captured after the edits proves nothing. Cover all 12
  generated pages, not the five CLAUDE.md used to name.
- seo.privacyLastUpdated has no admin editor. Deliberate: it is a
  legal document date and should require a considered edit.
- Adding a new social platform icon still requires a SOCIAL_ICONS
  entry in templates.js. The admin can add the profile but not the
  icon.
- /products (file) and /products/ (directory) coexist. GitHub Pages
  resolves the file. NEVER create products/index.html.
- productSlug(p) is built from baseName + size with whitespace
  stripped, so editing either field can move a live product URL.
  Check before changing them.
- Prose prices in site-data.json do not convert currency.
- Commit 3b7619e failed CI - sitemap.xml was committed alone by the
  legacy per-file publish route without its matching site-data.json.
  Left in history deliberately; it is the failure CI exists to catch.
- UTM params are dropped on every internal navigation. GA4 keeps the
  campaign for the session via its own state, so session reports
  survive; per-page and cross-session attribution degrade. sok_attr
  is unaffected. Not fixed deliberately.
- An unmapped utm_source resolves to RF, not DR. A same-host
  referrer resolves to DR so internal navigation cannot overwrite a
  first touch.
- The 90% figure appears in three slightly different framings across
  story.paragraphs[0], faq.items[6].a and posts[1].excerpt. All
  correct, none contradictory. Worth a consistency pass.

## Verification lessons
- For browser-loaded assets, verify the DEPLOYED bytes, not the
  committed ones. A 4-hour Cloudflare cache on admin.js made a
  working feature look broken. Static checks cannot see a cache.
- "Verified" must include "and I saw it run".
- PowerShell's `curl` is Invoke-WebRequest and follows redirects
  silently. Always use curl.exe -sI to inspect status codes.
- Purging Cloudflare and checking origin bytes does NOT clear the
  device's own HTTP cache. On an unexpired max-age, only clearing
  browser data or switching browser will revalidate.
- Parity catches things a diff review misses. Reordering the whyUs
  cards left the flag emojis behind on the wrong cards; only the
  before/after text comparison surfaced it.
- A field that renders but has no admin editor is as broken as one
  that is editable but renders nowhere. brand.fssaiNumber shipped
  render-only at first and had to be added to admin.js. Check both
  files, both directions.
