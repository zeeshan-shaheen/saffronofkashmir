# Infrastructure

Configuration that exists only in the Cloudflare and GitHub Pages dashboards and
nowhere in this repository.

**Verification status.** Every line is marked. `[verified]` was read from the
GitHub Pages API or observed directly over HTTP on 1 Sep 2026. `[unconfirmed]`
was supplied by the owner and could not be read, because no Cloudflare API
credential is available in the working environment. Treat `[unconfirmed]` lines
as a starting point and check the dashboard before relying on them. The list of
what still needs confirming is at the end.

---

## 1. SSL/TLS

**Mode: Full (Strict).** `[unconfirmed]` The setting itself cannot be read
without API access. Behaviour consistent with it is `[verified]`: every redirect
hop and every final response is `https`, and no request downgrades.

It was **Flexible** until 31 Aug 2026. That caused three faults at once:

- All 19 directory-style URLs answered `301` with a plaintext `http://`
  `Location`, so every no-slash inbound link took two hops through cleartext.
- Cloudflare-to-origin traffic was unencrypted.
- GitHub Pages could not provision a certificate at all.

### Switching sequence

Cannot be done in one step. In this order:

1. Un-proxy the DNS records (grey cloud).
2. Remove the custom domain in GitHub Pages, then re-add it.
3. Wait for the certificate to be issued.
4. Tick **Enforce HTTPS** in GitHub Pages.
5. Set SSL/TLS mode to **Full (Strict)** in Cloudflare.
6. Re-proxy the DNS records (orange cloud).

Setting Full (Strict) before a valid origin certificate exists returns **525 on
every request**.

### Certificate `[verified]`

Read from the GitHub Pages API:

```
state     approved
domains   ["saffronofkashmir.com"]        <- apex only, www is NOT covered
expires   2026-11-30
```

`https_enforced: true`, `custom_404: true`, source `main` at `/`.

The certificate expiring on **2026-11-30** is the one dated item here. Pages
renews automatically, but if HTTPS breaks near that date, check it first.

---

## 2. DNS

**Proxied (orange cloud):**

- Four `A` records for the apex, pointing at GitHub Pages
  (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`)
  `[unconfirmed: record list]`
- `www` `CNAME` to the apex `[unconfirmed: record type]`

Both hostnames resolving to Cloudflare address space rather than the GitHub
Pages IPs is `[verified]`, which confirms both are proxied.

**DNS only (grey cloud), and must stay that way:**

- `MX` for Zoho (`mx.zoho.com` 10, `mx2.zoho.com` 20, `mx3.zoho.com` 50)
  — presence `[verified]`
- `TXT` records, including SPF `[unconfirmed]`
- `DKIM` for Zoho and for MailerLite `[unconfirmed]`

Cloudflare cannot proxy `MX`, and proxying mail-related records breaks delivery
and domain authentication.

---

## 3. Redirect rules

Order matters. Listed in the order they must run.

**`[unconfirmed]` for every expression, rule name, and the order itself.**
The status codes, targets and query-string behaviour below are `[verified]` by
observation.

| # | rule | observed behaviour |
|---|---|---|
| 1 | retirement: `/blog/mongra-grade` | `301` to `/blog/grade-names/`, query preserved |
| 2 | retirement: `/blog/five-fakes` | `301` to `/blog/purity-tests/`, query preserved |
| 3 | `www-to-apex` | `301` to apex, **query dropped** |
| 4 | `trailing-slash-to-canonical` | `301` strips the trailing slash, query preserved |
| 5 | `index-html-to-root` | `301` `/index.html` to `/`, query preserved |
| 6 | `html-to-extensionless` | `301` strips `.html`, **query dropped** |

Retirement rule expressions, as applied:

```
(http.request.uri.path eq "/blog/mongra-grade/" or
 http.request.uri.path eq "/blog/mongra-grade")
   -> 301 https://saffronofkashmir.com/blog/grade-names/

(http.request.uri.path eq "/blog/five-fakes/" or
 http.request.uri.path eq "/blog/five-fakes")
   -> 301 https://saffronofkashmir.com/blog/purity-tests/
```

### Why the order matters

**Retirement rules must sit above `trailing-slash-to-canonical`.** A no-slash
request to a retired path would otherwise be normalised to the slash form, which
no longer exists, and answer `404` instead of redirecting. Both path shapes are
matched in each retirement expression so the rule fires whichever arrives.

### Why `www-to-apex` exists

`www.saffronofkashmir.com` is a `CNAME` to the apex, and the GitHub certificate
covers the apex only. Under Full (Strict) a request to `www` that reached the
origin would return **526**. The redirect runs at the edge before any origin
fetch, so the certificate never comes into play.

### Known defect: two rules drop the query string

**`www-to-apex` and `html-to-extensionless` drop the query string.** `[verified
2 Sep 2026, still failing after Preserve query string was enabled]`

```
curl -sSI "https://www.saffronofkashmir.com/?probe=838130808"
  301  Location: https://saffronofkashmir.com/                    query lost

curl -sSI "https://saffronofkashmir.com/products.html?probe=838130808"
  301  Location: https://saffronofkashmir.com/products            query lost
```

Re-tested with a unique token per request and no `cf-cache-status` on the
response, so this is not a cached redirect.

The other four rules preserve it:

```
/blog/mongra-grade/?utm_source=x&a=1  ->  /blog/grade-names/?utm_source=x&a=1
/blog/five-fakes?utm_source=x         ->  /blog/purity-tests/?utm_source=x
/products/?utm_source=x               ->  /products?utm_source=x
/index.html?utm_source=x              ->  /?utm_source=x
```

Any campaign link using `www` or a legacy `.html` path loses its attribution.

**Diagnostic.** Both failing rules transform the path: `www` keeps `/products`,
and `.html` is stripped. If their targets are built from
`http.request.uri.path`, the query is excluded by construction and the Preserve
query string setting has nothing to act on; the expression must use
`http.request.uri`, or append `http.request.uri.query`.
`trailing-slash-to-canonical` also transforms the path and does preserve, so
copy whatever it does.

Re-run the two `curl` commands above after any change. Do not mark this fixed
until both show the query in the `Location`.

---

## 4. Disabled rules

Five wildcard rules, for `index`, `products`, `recipes`, `blogs` and `privacy`,
are **Disabled, not deleted**. `[unconfirmed: all of it]`

They are superseded by `html-to-extensionless` and `index-html-to-root`. Reasons
they were replaced:

- They matched on the full URI including hostname, rather than on path alone.
- The `index` rule matched `http://` only, so it never fired on real traffic
  once HTTPS was enforced.
- Between them they left four `.html` paths uncovered.

Leave them disabled. Do not re-enable without re-checking those three points.

---

## 5. What cannot be done in the repository

**GitHub Pages has no redirect mechanism.** No `_redirects`, no `.htaccess`, no
config file of any kind. Every redirect on this site is a Cloudflare rule
applied by hand in the dashboard.

Retiring a page therefore takes **two actions**, and the order matters:

1. Merge the repo commit that removes the page, and confirm the URL returns
   `404` in production.
2. Only then add the Cloudflare redirect rule.

Adding the rule first means it is live while the page still is, so the redirect
and the page compete and the old URL keeps serving content that is supposed to
be gone.

Deleting the page from `data/site-data.json` is not enough on its own: **the
build writes pages but never removes retired ones.** The generated directory
must be deleted explicitly in the same commit.

---

## What still needs confirming

No Cloudflare API credential is available here, so the following were supplied
rather than read and should be checked against the dashboard:

1. SSL/TLS mode is literally set to **Full (Strict)**.
2. The exact expression, action, target, status code and query-string setting of
   each of the six active rules.
3. The **order** the six rules appear in.
4. The five disabled rules: that they exist, their names, their expressions, and
   that they are Disabled rather than deleted.
5. The full DNS record list, and which records are proxied against DNS only,
   beyond the apex and `www` confirmed by resolution.
6. The `TXT`, SPF and DKIM records for Zoho and MailerLite.

Correct anything wrong here in place. A reference that is trusted and wrong is
worse than no reference.
