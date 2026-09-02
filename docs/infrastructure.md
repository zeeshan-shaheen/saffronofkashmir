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
  (presence `[verified]`)
- `TXT` records, including SPF `[unconfirmed]`
- `DKIM` for Zoho and for MailerLite `[unconfirmed]`

Cloudflare cannot proxy `MX`, and proxying mail-related records breaks delivery
and domain authentication.

---

## 3. Redirect rules

Order matters. Listed in the order they must run.

Rule names and the order itself are `[unconfirmed]`. The status codes, targets,
query-string behaviour and the two corrected expressions below are `[verified]`
by observation on 2 Sep 2026.

| # | rule | observed behaviour |
|---|---|---|
| 1 | retirement: `/blog/mongra-grade` | `301` to `/blog/grade-names/`, query preserved |
| 2 | retirement: `/blog/five-fakes` | `301` to `/blog/purity-tests/`, query preserved |
| 3 | `www-to-apex` | `301` to apex, path and query preserved |
| 4 | `trailing-slash-to-canonical` | `301` strips the trailing slash, query preserved |
| 5 | `index-html-to-root` | `301` `/index.html` to `/`, query preserved |
| 6 | `html-to-extensionless`, query present | `301` strips `.html`, query preserved |
| 7 | `html-to-extensionless`, no query | `301` strips `.html` |

All seven preserve the query string. `[verified 2 Sep 2026]`

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

### Query string handling

All seven rules preserve the query string. `[verified 2 Sep 2026]`

**Preserve query string has no effect when the target is a fully-specified
dynamic expression.** The checkbox was ticked on both failing rules and changed
nothing. The query has to be in the expression itself.

`www-to-apex` targets:

```
concat("https://saffronofkashmir.com", http.request.uri)
```

`http.request.uri` is path and query together, and it omits the `?` when there
is no query, so a query-less request does not pick up a bare separator. This is
what `trailing-slash-to-canonical` was already doing, which is why that rule
never had the fault.

`html-to-extensionless` is **two rules**, split on whether a query exists:

```
query present   when  http.request.uri.query ne ""
  concat("https://saffronofkashmir.com", substring(http.request.uri.path, 0, -5),
         "?", http.request.uri.query)

no query        when  http.request.uri.query eq ""
  concat("https://saffronofkashmir.com", substring(http.request.uri.path, 0, -5))
```

Split rather than one rule using `regex_replace`, because **`regex_replace`
requires a Business plan and is not available on this zone**. The split also
avoids appending a bare `?` to a query-less request, which a single
unconditional `concat` would do.

`-5` strips `.html`. Both rules stay scoped to top-level paths: a `.html` path
under a subdirectory does not match and still returns 404.

### Regression tests

Run all eight after any change to these rules. The first four must show the
query, the next two must show no trailing `?`, the last two must stay 404.

```
curl -sSI "https://www.saffronofkashmir.com/?a=1"               | grep -i location
curl -sSI "https://www.saffronofkashmir.com/products/?a=1"      | grep -i location
curl -sSI "https://saffronofkashmir.com/products.html?a=1"      | grep -i location
curl -sSI "https://saffronofkashmir.com/terms.html?a=1&b=2%20x" | grep -i location
curl -sSI "https://www.saffronofkashmir.com/"                   | grep -i location
curl -sSI "https://saffronofkashmir.com/products.html"          | grep -i location
curl -sS -o /dev/null -w "%{http_code}\n" "https://saffronofkashmir.com/blog/gi-635.html"
curl -sS -o /dev/null -w "%{http_code}\n" "https://saffronofkashmir.com/products/royal-mongra-2g.html"
```

Results, 2 Sep 2026:

```
www/?a=1                        -> https://saffronofkashmir.com/?a=1
www/products/?a=1               -> https://saffronofkashmir.com/products/?a=1
/products.html?a=1              -> https://saffronofkashmir.com/products?a=1
/terms.html?a=1&b=2%20x         -> https://saffronofkashmir.com/terms?a=1&b=2%20x
www/                            -> https://saffronofkashmir.com/
/products.html                  -> https://saffronofkashmir.com/products
/blog/gi-635.html               -> 404
/products/royal-mongra-2g.html  -> 404
```

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

## 5. Pricing

**The INR price is not a conversion of the AED price.** India is priced
separately, at roughly half the AED price converted.

`brand.currencies.INR` carries `markup: -50`, and the displayed price is
`aed * rate * (1 + markup / 100)`. AED 65 shows as about INR 846, where a
straight conversion would be about INR 1,691.

**A Merchant Center feed built by converting AED will be wrong for India by a
factor of two.** Country pricing has to come from the INR figure the site
actually shows, not from the base price.

Product JSON-LD carries AED only. That matches what a crawler sees, because the
currency switcher is client-side and Google does not run it. Do not add a second
Offer in INR: nothing on the page binds a currency to a country, so a second
Offer gives Google no basis to choose between them. The supported routes are a
Merchant Center feed with per-country pricing, or country-specific URLs, neither
of which exists yet.

---

## 6. What cannot be done in the repository

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
3. The **order** the seven rules appear in.
4. The five disabled rules: that they exist, their names, their expressions, and
   that they are Disabled rather than deleted.
5. The full DNS record list, and which records are proxied against DNS only,
   beyond the apex and `www` confirmed by resolution.
6. The `TXT`, SPF and DKIM records for Zoho and MailerLite.

Correct anything wrong here in place. A reference that is trusted and wrong is
worse than no reference.
