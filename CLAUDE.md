# CLAUDE.md — saffronofkashmir.com

Read this fully before touching anything. These rules protect a **live business website**.

## What this project is
- A **static website** on GitHub Pages, behind Cloudflare. Domain: https://saffronofkashmir.com
- **There is no server and no database.** You cannot run server-side code, store user data, or keep secrets in any file that ships in this repo.
- All content lives in ONE file: `data/site-data.json` — the **single source of truth**.
- `assets/admin/templates.js` turns that JSON into the site's HTML (pure functions: data → HTML strings).
- `build.js` regenerates the HTML pages from the JSON + templates. Run with `node build.js`.
- `admin.html` + `assets/admin/admin.js` are a **browser-only** editor: it edits the JSON and commits the regenerated pages to GitHub via the GitHub API. You will rarely need to touch the publish logic.
- If an older handoff document and the live `data/site-data.json` disagree on any value (phone number, email, product details, etc.), **the JSON wins.** The handoff may be out of date.

## How a change must flow (follow this every time)
- **Content change** → edit `data/site-data.json` → `node build.js` → review the diff.
- **Markup / page-output change** → edit `assets/admin/templates.js` → `node build.js` → review the diff.
- **New editable field in the admin** → you MUST edit BOTH files:
  - `templates.js` so the field actually appears on the live site, AND
  - `admin.js` so it can be edited.
  - A field added only to `admin.js` saves into the JSON and is **invisible on the site**. This is the single most common mistake on this project. Do not make it.
- **NEVER hand-edit the generated HTML files** (`index.html`, `products.html`, `recipes.html`, `blogs.html`, `404.html`, `sitemap.xml`). They are build output and will be overwritten.

## Hard rules — do not break
1. `templates.js` must stay **dual-environment (UMD)**: pure functions only. No `document`, `window`, `fetch`, DOM, or browser-only APIs inside it. It has to run under Node (via `build.js`) AND in the browser (the admin).
2. Every generated page must keep: exactly **one `<h1>`**, valid/parseable **JSON-LD**, correct `canonical` + `og:` tags. `admin.html` keeps its `noindex`. `robots.txt` keeps `Disallow` for `/admin.html`, `/assets/admin/`, `/data/`.
3. Publishing must stay **idempotent and skip-unchanged**. Do not alter that behaviour.
4. **NEVER commit secrets.** No GitHub token, no API keys, no service-account files. The owner's token lives only in their browser. If a feature needs a key, it goes in a runtime config field or a third-party service — never in the repo.
5. **Never put real images into any package/zip.** Images live in the repo. Placeholders are for local testing only and must be deleted before packaging.
6. Apostrophes/quotes: data uses real `'` and `’`; testimonials use curly quotes. Keep them as they are.

## Verification — run after EVERY change, before committing
1. Syntax: `node --check assets/admin/templates.js && node --check assets/admin/admin.js && node --check build.js`
2. Build: `node build.js` must succeed and write all pages.
3. Visible-text parity check (script below).
   - **Important:** when you *intentionally* add visible content (e.g. a sale badge), parity WILL report a diff — that is expected. Read the diff and confirm that **only your intended text changed**. The check exists to catch *unintended* changes, not to forbid intended ones.
4. Confirm JSON-LD still parses on every page you changed.

Parity script:
```python
import re, html
def textof(p):
    s = open(p).read()
    s = re.sub(r'<script.*?</script>', ' ', s, flags=re.S)
    s = re.sub(r'<[^>]+>', ' ', s); s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()
# 1) back up each generated page, 2) run node build.js,
# 3) diff textof(new) vs textof(backup) and review every difference.
```

## Git workflow — mandatory
- Work on a branch named `feature/<short-name>`. **Never commit to `main` directly. Never push to `main` without explicit human approval.**
- One feature = one clean commit (or a small, clear set). Write plain, descriptive commit messages.
- After each phase: show the human the **diff** and the **verification output**, then **STOP and wait** for approval before the next phase.
- If anything is ambiguous, **ask**. Do not improvise structural decisions on a live site.

## Things you must NOT do on this project
- Do not add a server, a database, or any server-side code.
- Do not store user/customer data in this repo or in client-side code. Data capture goes to a third-party service the human names.
- Do not rebuild analytics that Google Analytics or Search Console already provide.
- Do not add rating/review structured data (`aggregateRating`, review stars) unless real, displayed customer reviews exist — faking it breaks Google policy.
- Do not create indexable Markdown copies of pages for "AI SEO" — that is duplicate content and can hurt rankings.
- Do not make pop-ups that cover content on mobile page load (Google penalises intrusive interstitials).
- Do not refactor, rename, reformat, or "tidy" files you were not asked to change.
