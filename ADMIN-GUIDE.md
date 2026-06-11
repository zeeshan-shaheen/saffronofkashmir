# Saffron of Kashmir — Admin Guide

Your website now has a built-in admin panel at **`/admin.html`**. It lets you edit
everything on the site — products, prices, recipes, blog posts, FAQs, photos, contact
details, SEO text — and publish the changes to the live site with one click.

There is no separate server and nothing to pay for. The admin panel talks directly to
your GitHub repository: when you press **Publish**, it rebuilds the site's pages from
your content and commits them to GitHub. GitHub Pages then redeploys your site
automatically (usually in under a minute).

---

## 1. One-time setup

### a) Upload the website package
Upload **all files and folders** in this package to your GitHub repository (the same
repo that hosts saffronofkashmir.com), replacing the old files. The important new
pieces are:

```
admin.html              ← the admin panel
data/site-data.json     ← all of your site's content, in one file
assets/admin/           ← the admin app + page templates
build.js                ← optional, for developers
robots.txt              ← updated so Google ignores the admin
```

### b) Create a GitHub access token (≈2 minutes)
The token is the admin panel's "password" — it's what allows it to save changes to
your repository.

1. Go to **github.com → your profile photo → Settings**
2. Scroll to **Developer settings** (bottom of the left menu)
3. **Personal access tokens → Fine-grained tokens → Generate new token**
4. Name it e.g. `site-admin`, set an expiry (you can pick up to 1 year)
5. Under **Repository access** choose **Only select repositories** → pick your website repo
6. Under **Repository permissions** set **Contents → Read and write** (leave everything else as "No access")
7. Click **Generate token** and **copy it** — you won't see it again

### c) Connect
Open **`https://saffronofkashmir.com/admin.html`**, fill in:

- **Owner** — your GitHub username (or organisation)
- **Repository** — the repo name
- **Branch** — usually `main`
- **Token** — paste the token from step (b)

…and press **Connect**. That's it. The token is saved only in your own browser, so
you only do this once per device.

> Want to look around first? Open `admin.html#demo` — full editor, nothing gets saved.

---

## 2. Day-to-day use

| I want to… | Where |
|---|---|
| Change a price, product text or WhatsApp message | **Products** |
| Add / remove / reorder a product, recipe, post, FAQ, testimonial | The **+ Add** button and the ↑ ↓ ⧉ ✕ controls on each item |
| Swap a photo | Any **Upload** button, or the **Media** tab |
| Edit hero text, story, steps, contact strip, footer | **Homepage** |
| Write a blog article | **Blog posts** (blank line = paragraph, `## ` = sub-heading, `**bold**`, `[link](page.html)`) |
| Change phone / WhatsApp / email / Instagram everywhere at once | **Brand & contact** |
| Edit Google titles & descriptions | **SEO & meta** |
| See changes before going live | **Preview ▾** (top bar) |
| Make it live | **Publish** (top bar) |

Things worth knowing:

- **Drafts are automatic.** Every edit is saved in your browser as you type. Nothing
  touches the live site until you press **Publish**. If you close the tab mid-edit,
  you'll be offered the draft when you come back.
- **Publish is safe to repeat.** Files that didn't change are skipped, and every
  publish is a normal Git commit — your full history stays in GitHub, so any change
  can be rolled back there.
- **WhatsApp links** are built automatically from the number in *Brand & contact*.
  In text fields you can write `[Message us](wa:Hi! I'd like a bulk quote.)` to make
  a WhatsApp link with a pre-filled message.
- **Per-gram prices** in the comparison table are calculated for you from price ÷ grams.
- **The footer year** updates by itself each time you publish.

### If the live site looks unchanged after publishing
GitHub Pages takes ~30–60 seconds to deploy. After that, if you still see old
content, it's the Cloudflare cache: either wait a few minutes, do a hard refresh
(Ctrl/Cmd+Shift+R), or in the Cloudflare dashboard use **Caching → Purge Everything**.

---

## 3. Security notes

- The token lives **only in your browser** (and is sent only to `api.github.com`).
  Don't share it; anyone with it can edit the repository.
- Use the **fine-grained** token type scoped to this one repo, as described above —
  then even in the worst case it can't touch anything else.
- You can revoke it any time: GitHub → Settings → Developer settings → your token → Delete.
- `admin.html` being public is fine — without a token it can read your already-public
  site content but cannot change anything. It's hidden from Google via `robots.txt`
  and a `noindex` tag.

---

## 4. For developers (optional)

- All content lives in **`data/site-data.json`**; the page templates are in
  **`assets/admin/templates.js`** (plain functions: data → HTML).
- `node build.js` regenerates all pages locally from the JSON — useful for bulk
  edits in a code editor.
- Because everything is structured JSON, this content can be migrated to any future
  server/CMS without rewriting the site.
