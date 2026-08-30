# Resume — saffronofkashmir.com
Last updated: 29 August 2026

Written as instructions to whoever picks this up next, not as a description.
Read the constraints section before touching any copy.

## Repo facts
Generated site: data/site-data.json -> assets/admin/templates.js ->
build.js -> 30 output files. NEVER edit generated .html.
Hosting: GitHub Pages behind Cloudflare. NOT Cloudflare Pages.
No _redirects file. Redirects and headers are set in the Cloudflare
dashboard, outside this repo.
Publishing: the admin panel at /admin is the primary route.
Node v26.3.0, zero dependencies.

## Architecture

- **Blog posts are individual pages** at /blog/<slug>/, one per
  published post, built by renderPostPage(data, p) on the same shape
  as renderProductDetail. Own head, canonical, og: tags, one h1, one
  BlogPosting with its own mainEntityOfPage, breadcrumbs Home > Blog >
  Post, the shared sidebar, footer.
- blogs.html is an excerpt index. Cards link out; no article bodies.
- **Fragment anchors are retained on the index cards deliberately.**
  Each card keeps id="<slug>", so an old /blogs#<id> link still lands
  on the right card. **Do not attempt Cloudflare redirects for these.
  A URL fragment is never sent to the server, so no edge rule can ever
  see one.** The retained id is the only redirect that can exist.
- postSlug(p) is slugify(p.id). The post id is both the page slug and
  the index anchor, so changing an id moves a live URL.
- **livePosts(data) is the single draft gate.** Four consumers: page
  emission in renderAll, index cards, sitemap.xml, llms.txt. Add any
  new consumer to that helper rather than filtering again.
- **renderPolicyPage(data, key) serves all four policy pages**, driven
  by the policies object. renderPrivacyPolicy is a thin delegate kept
  only because the admin preview map calls it by name. Do not add a
  second way to render a policy page.
- pageUrl() strips .html for any root-level page not in PAGE_PATHS, so
  a page added through the data gets an extensionless URL with no code
  change.
- Build writes **30 files**. sitemap.xml carries **27 URLs**.
- blogSidebar(data) is shared by the index and every post page.
- bodyToHtml and policyBody both turn a block whose every line starts
  "- " into a list. inlineMd supports **bold**, *em*, [link](url),
  wa: links and `code`.

## Standing constraints

### No health, medical, therapeutic or wellness claims. Anywhere.
Not in body copy, not in a heading, not in a meta description, not in
JSON-LD, not in a category label. This is a hard rule and it has been
broken twice already: a "Health Benefits" post and category were
deleted 29 Aug 2026, and a dosage note survived in a recipe tip after
that and had to be removed separately.

Grep this list over every generated page before shipping copy:

    depression, anxiety, sleep, weight loss, skin, pregnancy,
    medicinal, cures, treats, heals, remedy, therapeutic,
    benefits your, wellness, dose, dosage, mg, daily,
    published research, antioxidant, immunity

Use word boundaries and strip HTML tags first, or you will drown in
false positives: "mg" matches every <img>, "skin" matches "asking",
"treats" and "heals" match ordinary verbs.

**The only acceptable survivors are in terms.html**, where the words
sit inside their own negation: "We make no claim that saffron treats,
prevents or cures any condition."

Known harmless collisions left in place, all ordinary English, none a
health claim: "drunk daily across Emirati households" in the Arabic
cuisine post, "deals with them daily" in the GI post, "Best for Daily
cooking" in a product spec row.

### Structured data: three fields are deliberately absent
Google Search Console reports these as missing non-critical items on
all four recipes. **That is expected and accepted. Do not "fix" it.**
The same note is in the Recipe schema builder in templates.js.

- **aggregateRating.** We have no real reviews. Fabricated rating
  markup risks a Google manual action, and CLAUDE.md already forbids
  review markup outright. Add only if real, displayed customer reviews
  ever exist.
- **nutrition.** Estimated calorie figures presented as structured
  data would be invented data. Add only after a real per-recipe
  calculation, not from a generic table.
- **video, and per-step image.** The media does not exist. Do not
  substitute stock or placeholder assets to satisfy a validator.

Recipes carry HowToStep objects with name, text and a url anchoring to
a real id on the rendered step, plus keywords. Those were the three
flagged issues worth fixing, and they are done.

### No business address anywhere
Decided, reversed once, and decided again. Do not add one and do not
infer one from the FSSAI registration. No place name in the footer
bottom bar, the Terms Seller Details block, or any contact block.
Pampore in descriptive product or brand copy is fine and expected;
footer.about and brand.tagline are known and accepted.
brand.legalName and brand.registeredAddress were removed from the JSON
and must not come back. Organization.address stays the minimal
{ addressCountry: 'IN', addressRegion: 'Jammu & Kashmir' }.

### No per-parcel dispatch-origin claim
Pampore is where the saffron grows. It is not a stated departure
point. Parcels do not all leave from one place, so "ships from India"
on every order would be untrue. Saying nothing is accurate. A future
session must not helpfully add an origin sentence back. The site
previously claimed stock was held and dispatched from Dubai; that was
false and is gone.

### brand.email is info@saffronofkashmir.com
Used by the footer, contact strip, Organization JSON-LD contactPoint
and all four policy pages. It was briefly switched to care@ on 29 Aug
2026 and reverted the same day.
**A raw grep for info@ on a live page returns ZERO.** Cloudflare email
obfuscation rewrites every address to "[email protected]" plus a
cdn-cgi/l/email-protection link whose hex payload is XOR encoded with
its own first byte as the key. Decode it rather than reporting a false
failure: bytes.fromhex(h), key = b[0], then chr(c ^ key) for the rest.

### FSSAI
Basic registration 21026111000535, verified against the certificate by
the owner 28 Aug 2026. Footer text only, worded "FSSAI Registration
No. ...". The word is Registration, not Licence. **Never in JSON-LD**:
no schema.org property means FSSAI registration, so there is nowhere
correct to put it. Blank brand.fssaiNumber and the whole footer
segment disappears rather than leaving a stranded label.

### WhatsApp routing and the SOK_ATTR trap
UAE_COUNTRIES = AE, SA, QA, OM, KW, BH routes to the UAE number.
Everything else, including GB and US, routes to India. One list drives
routing, the timezone fallback and the currency override so they
cannot drift. The static href is always India, so buttons work with
JavaScript off. Routing is independent of #sok-curr being present,
which is what makes it work on 404.
**Rewriting a wa.me href wipes the order-attribution Ref: code.**
Routing re-stamps via SOK_ATTR.stampAll(). Any future code touching
those hrefs must do the same, or every routed order silently loses
attribution and nothing visibly breaks.

### Writing style
No em dashes, no en dashes, plain hyphens for ranges. No AI-tell
vocabulary. Short concrete sentences. Straight punctuation except the
curly quotes inside testimonials.

## Verification

Run the CLAUDE.md block, then check: 30 files built, sitemap 27 URLs,
draft absent from all four consumers, one h1 per page, JSON-LD valid,
the 21-term health grep, no bracketed placeholders in served HTML,
every internal link resolves, the category filter still works.

_parity_check.py and _check_jsonld.py live in the working scratch
directory, OUTSIDE the repo, and are not committed. .nojekyll
publishes underscore directories, so a _parity_baseline/ at repo root
would ship plain-text duplicates of every page. Both listings are in
CLAUDE.md so they can be recreated.
**Baseline BEFORE editing, from a clean tree.** A baseline captured
after the edits proves nothing. This was got wrong once: a stale
baseline reported nonsense until it was recaptured from the real
branch point via a stash.

## Open items

- **harvest-diary-2026 is a draft** with a placeholder dateISO of
  2026-11-01 and six [YOUR PHOTO] / [YOUR FIELD] markers still in it.
  It needs the real publication date and the owner's photographs
  before it ships. Intended for the October or November bloom, written
  during the actual harvest, not before.
- **Blog posts have gaps where owner material belongs.** Sections were
  cut rather than filled with invention when the material did not
  exist. Specifically:
  - gi-635 says the fields are in Pampore inside the GI area, but
    shows nothing. A field photograph belongs here.
  - read-lab-report has an "Our report" section that states the saffron
    is tested by IIKSTC, NABL TC-9209, and that the report is sent on
    request. **The ISO 3632 certificate itself is not published.**
    Publishing it is the strongest single trust signal available.
  - five-fakes lost its whole comparison section, which was to hold a
    photograph of adulterated market samples beside ours.
  - production-figures has no own-yield figure.
- Terms page has not been read by a lawyer or CA in India.
- Transit times (4-6 days) and processing time (2 working days) are
  owner-supplied and unmeasured. Correct after the first real
  international shipment.
- Testimonial provenance unconfirmed for the two remaining
  testimonials. Both were added in the initial bulk upload 8ee9734 on
  12 Jun 2026 and nothing in the repo distinguishes real from
  placeholder. No ref-code mapping is possible: attribution shipped
  10 Aug 2026, two months later, so no ref ever existed for them.
- **Three Cloudflare Bulk Redirects are missing** for /terms.html,
  /shipping-policy.html and /returns-policy.html, which serve 200
  rather than redirecting to the extensionless form. The five legacy
  pages have redirects; these three do not. Canonical, sitemap,
  llms.txt and every internal link point at the extensionless URL, so
  this is a consistency gap rather than an SEO fault. Outside this
  repo.
- **Saffron Oil copy is now descriptive only.** It reads "Cold-pressed
  almond oil infused with Kashmiri saffron threads" with no claimed
  use, benefit or application. Whether it can be sold at all under an
  FSSAI registration covering food category 12 is an unresolved
  regulatory question, not a website one. The product is coming_soon.
- covercgpt-1.webp: "EST. 2004" burnt into the artwork, filename reads
  as an AI tool name, serves as og:image on four pages. One re-export
  fixes both.
- Trade licence not filed in evidence/.
- Lab report is issued under the owner's other food company.
- No consent gate for GA, Meta Pixel or the sok_attr identifier.
- brand.whatsappNumbers[0].market reads "UAE & Middle East" with no
  orders/enquiries distinction, although routing treats that line as
  support only.
- Confirm 2026 is the correct registration year for foundingDate.

## Known limitations

- **blogs.html is 28,953 bytes and that is accepted.** Do not chase a
  25 KB target: the floor with zero JSON-LD is 25,501 bytes, so
  reaching it means stripping structured data off the index or
  truncating excerpts. Both were considered and rejected 29 Aug 2026.
  Breakdown: chrome 17,763, thirteen excerpt cards 7,738, JSON-LD
  3,452. The index JSON-LD was already trimmed from 7,275 by cutting
  each blogPost entry to headline plus URL, since every post carries a
  full BlogPosting on its own page.
- **main.js is still served max-age=14400.** The Cloudflare cache rule
  is created but ineffective on /assets/js/, /assets/css/ and
  /assets/admin/, verified on a fresh MISS for style.css so it is not
  a stale object. Returning visitors keep the old script for up to 4
  hours, so new HTML can pair with old JS. Test JS and CSS changes in
  a private window. Two false "broken feature" diagnoses have already
  come from this.
- seo.privacyLastUpdated has no admin editor and is no longer read by
  the privacy page; that date now comes from
  policies.privacy.lastUpdated.
- Adding a new social platform icon still needs a SOCIAL_ICONS entry
  in templates.js.
- /products (file) and /products/ (directory) coexist. GitHub Pages
  serves the file. NEVER create products/index.html.
- productSlug(p) is built from baseName + size with whitespace
  stripped, so editing either field can move a live product URL.
- Prose prices in site-data.json do not convert currency.
- UTM params are dropped on every internal navigation. GA4 keeps the
  campaign for the session; per-page and cross-session attribution
  degrade. sok_attr is unaffected. Not fixed deliberately.
- An unmapped utm_source resolves to RF, not DR. A same-host referrer
  resolves to DR so internal navigation cannot overwrite a first
  touch.
- The 90% figure appears in three slightly different framings across
  story.paragraphs[0], faq.items[6].a and posts[1].excerpt. All
  correct, none contradictory.
- Commit 3b7619e failed CI: sitemap.xml was committed alone by the
  legacy per-file publish route. Left in history deliberately; it is
  the failure CI exists to catch.

## Accepted risks - do not re-litigate

- Admin panel is publicly reachable at /admin and /admin.html. GitHub
  PAT stored plaintext in localStorage on the same origin as public
  pages that load Meta Pixel and GTM. Any XSS on the origin yields
  repo write plus CI code execution via workflows:write. Owner
  accepted 9 Aug 2026. Recoverable fix:
  git checkout -b security/admin-offline 2f57ca4
- Token permissions are broader than needed. Owner accepted.
- CI is advisory, not blocking, because Repository admin bypasses the
  ruleset. A red check does not stop a publish; check Actions manually
  after publishing.
- 30 commits in history carry a Co-Authored-By trailer and three April
  2026 commit subjects name an assistant. Removing them means
  rewriting every SHA, which invalidates the restore points cited in
  this file. Not visible on the live site. CLAUDE.md forbids the
  trailer going forward.

## Verification lessons

- For browser-loaded assets, verify the DEPLOYED bytes, not the
  committed ones.
- "Verified" must include "and I saw it run".
- PowerShell's curl is Invoke-WebRequest and follows redirects
  silently. Use curl.exe -sI to inspect status codes.
- Purging Cloudflare does NOT clear the device's own HTTP cache. On an
  unexpired max-age, only clearing browser data or switching browser
  will revalidate.
- Parity catches what a diff review misses. Reordering the whyUs cards
  left the flag emojis on the wrong cards; only the before/after text
  comparison surfaced it.
- A field that renders but has no admin editor is as broken as one
  that is editable but renders nowhere. Check both files, both
  directions.
- Substring greps lie. Word-boundary the pattern and strip HTML tags
  before believing a hit count.
