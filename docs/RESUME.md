# Resume — saffronofkashmir.com
Last updated: 9 August 2026

## Repo facts
Generated site: data/site-data.json -> assets/admin/templates.js ->
build.js -> 14 output files. NEVER edit generated .html.
Origin: GitHub Pages behind Cloudflare. NOT Cloudflare Pages.
No _redirects file. Redirects and headers are set in the Cloudflare
dashboard.
Publishing: the admin panel at /admin is the primary route.
Node v26.3.0, zero dependencies.

## Shipped and live
- gitignore, gitattributes, nojekyll; _archive/ untracked and moved
  off-repo (files at d:\SOK git clone\_archive-saffronofkashmir\)
- Claims cleanup: ISO 3632 "Grade A" -> "Category I" (21 strings);
  crocin spec corrected to 203.48; "every batch tested" -> single
  independent test with IIKSTC named; founding year 2004 -> 2026
  (10 instances removed); heritage copy = three generations of family
  farming, no dates; same-day dispatch deleted (5 places); hero.lead
  now says packed in Pampore, dispatched from Dubai; order buttons
  read "Notify me when available" for non-available status
- 404 page: root-relative paths, renders styled at any depth
- Extensionless URLs: root-relative internal links, canonicals,
  og:url, sitemap. base/'../../' prefix system replaced by pageUrl()
  and asset() helpers
- Cloudflare Bulk Redirects: 5 x 301 from old .html URLs. Verified.
- Social: 7 platforms (Instagram, Facebook, TikTok, Pinterest,
  LinkedIn, YouTube, Threads) in footer, sameAs, social_click GA4
  event, admin editor with no-icon warning driven by
  socialIconNames()
- CI: .github/workflows/build-check.yml runs
  `git add -A && git diff --cached --exit-code` on push and PR.
  Catches both content drift and untracked build output.
- Ruleset on main: restrict deletions, block force pushes, require
  "Build check". Repository admin is on the bypass list, which is
  what lets the panel publish.
- Atomic publish via Git Data API (blob -> tree -> commit -> ref).
  WORKING, verified by real publish: one commit, green CI, token
  updates the ref under the ruleset. Legacy per-file Contents API
  path retained, switchable in Settings > Publish method.
- Build determinism: sitemap lastmod reads meta.lastPublished;
  footer copyright is a static constant; privacy policy date reads
  seo.privacyLastUpdated. No new Date() affects build output.

## Next session — Step 11, order capture
The only remaining item that changes revenue. Nothing shipped so far
has changed what a visitor does or what the owner can measure.
Still true today: not a single order can be attributed to a page,
post, or channel.

Scope:
1. GA4 event on every WhatsApp click, tagged with product, page,
   position
2. UTM handling so social traffic is distinguishable from direct
   (seven channels are being posted to via a social media manager)
3. Order capture form -> datastore -> order ID -> pre-filled WhatsApp
   message
4. Cloudflare Worker + D1 for the endpoint. GitHub Pages cannot host
   it; Cloudflare is already in the request path.
Then run 2-4 weeks and measure: which pages produce orders, repeat
purchase rate, AOV by product, whether the overlay converts.

## Not started
- Step 6: og:image -> JPEG; og:type product on detail pages;
  product ids ship as schema.org sku and three contradict the
  product (royal-1g is 2g, honey-250g is 500ml, kahwa-50g is 100g).
  templates.js:801 hardcodes p.id === 'royal-1g' for the blog
  sidebar - must change together.
- Step 7: currency switcher misses 8 locations (compare table,
  per-gram spec rows, related-products list, hero CTA, blog sidebar
  fallback, product meta description). Prose AED amounts in
  site-data.json can never convert.
- Step 8: overlay fires at 4s OR first scroll, every page, no mobile
  exemption - against the site's own CLAUDE.md rule. Currently
  enabled: true.
- Step 10: CLAUDE.md rewrite. Its schema section, function table and
  file counts are still wrong, and it references three verification
  scripts that do not exist.
- Step 12: SEO and competitor analysis. Do after Step 11 has produced
  data. Expect it to reopen URL structure, blog architecture (posts
  currently live at /blogs#id inside <details> with BlogPosting
  JSON-LD pointing at fragments), and product page depth.

## Carried forward - unresolved claims
- og:image (covercgpt-1.webp) has "EST. 2004" burnt into the artwork.
  Last live instance of the false founding claim. Cached on Facebook,
  WhatsApp and LinkedIn. Deferred by owner 9 Aug 2026.
- "700-Year Legacy" in posts[1].title and story.paragraphs[0] - no
  source
- "Pampore produces 90% of India's saffron" in 3 locations - the
  figure is normally cited for Kashmir as a whole
- Testimonials (3) - real customers per owner, order references not
  yet mapped
- FSSAI number and trade licence not filed in evidence/
- Lab report is issued under the owner's other food company, not
  Saffron of Kashmir. A fresh test under the retail brand name was
  discussed but not commissioned.
- Image provenance: 15 root .webp files confirmed as owner's own
  photography, 9 Aug 2026

## Accepted risks - do not re-litigate
- Admin panel is publicly reachable at /admin and /admin.html.
  GitHub PAT stored plaintext in localStorage on the same origin as
  public pages that load Meta Pixel and GTM. Any XSS on the origin
  yields repo write plus CI code execution via workflows:write.
  Owner accepted 9 Aug 2026. The fix is recoverable:
  git checkout -b security/admin-offline 2f57ca4
- Token permissions are broader than needed (workflows: Read and
  write, ~28 unnecessary read scopes). Owner accepted.
- CI is advisory, not blocking, because Repository admin bypasses
  the ruleset. A red check does not stop a publish - Actions must be
  checked manually after publishing.

## Known limitations
- seo.privacyLastUpdated has no admin editor. Deliberate: it is a
  legal document date and should require a considered edit.
- Adding a new social platform icon still requires a SOCIAL_ICONS
  entry in templates.js. The admin can add the profile but not the
  icon.
- /products (file) and /products/ (directory) coexist. GitHub Pages
  resolves the file. NEVER create products/index.html.
- Prose prices in site-data.json do not convert currency.

## Verification lessons
- For browser-loaded assets, verify the DEPLOYED bytes, not the
  committed ones. A 4-hour Cloudflare cache on admin.js made a
  working feature look broken. Static checks cannot see a cache.
- "Verified" must include "and I saw it run". node --check and
  request-sequence inspection proved the atomic publish code was
  correct; nothing proved it was reachable.
- PowerShell's `curl` is Invoke-WebRequest and follows redirects
  silently. Always use curl.exe -sI to inspect status codes.

## Open Cloudflare task
Cache rule: bypass cache for /assets/admin/*, /admin.html and /admin.
Not yet created. Without it the next admin.js change repeats the
4-hour cache problem.
