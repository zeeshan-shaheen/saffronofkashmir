/* ============================================================
   Saffron of Kashmir — site templates
   Pure functions: data (site-data.json) -> HTML strings.
   Used by the admin panel (publish/preview) and build.js.
   Works in both the browser and Node (UMD-style export at bottom).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SOKTemplates = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function waUrl(brand, text) {
    return 'https://wa.me/' + brand.whatsappNumber + '?text=' + encodeURIComponent(text || brand.defaultWaText);
  }

  // Inline mini-markdown: [label](url), **bold**, *em*.
  // Special href scheme  wa:Message text  -> WhatsApp link with that message.
  function inlineMd(brand, s) {
    let out = esc(s);
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      href = href.trim();
      let attrs = '';
      if (href.toLowerCase().startsWith('wa:')) {
        href = waUrl(brand, href.slice(3));
        attrs = ' target="_blank" rel="noopener"';
      } else if (/^https?:\/\//i.test(href)) {
        attrs = ' target="_blank" rel="noopener"';
      }
      return '<a href="' + esc(href) + '"' + attrs + '>' + label + '</a>';
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return out;
  }

  // Plain-text version of mini-markdown (for JSON-LD).
  function plainMd(s) {
    return String(s == null ? '' : s)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2');
  }

  // Blog body: blank-line paragraphs; lines starting "## " become <h3>.
  function bodyToHtml(brand, body) {
    const blocks = String(body || '').replace(/\r\n/g, '\n').split(/\n\s*\n/);
    return blocks.map(function (b) {
      b = b.trim();
      if (!b) return '';
      if (b.startsWith('## ')) return '              <h3>' + esc(b.slice(3).trim()) + '</h3>';
      return '              <p>' + inlineMd(brand, b.replace(/\n/g, ' ')) + '</p>';
    }).filter(Boolean).join('\n');
  }

  function ld(obj) {
    return '  <script type="application/ld+json">\n  ' +
      JSON.stringify(obj, null, 2).replace(/\n/g, '\n  ') +
      '\n  </script>';
  }

  function statusBadge(status) {
    if (status === 'out_of_stock') {
      return '<span style="position:absolute;top:12px;left:12px;background:#9d2235;color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px;">Out of Stock</span>';
    }
    if (status === 'coming_soon') {
      return '<span style="position:absolute;top:12px;left:12px;background:#A8842F;color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px;">Coming Soon</span>';
    }
    return '';
  }

  function statusAvailability(status) {
    if (status === 'out_of_stock') return 'https://schema.org/OutOfStock';
    if (status === 'coming_soon') return 'https://schema.org/PreOrder';
    return 'https://schema.org/InStock';
  }

  function productPriceHtml(p) {
    if (p.sale && typeof p.sale.price === 'number') {
      var saleLabel = p.sale.label
        ? ' <span style="background:#e8f5e9;color:#1d7a46;font-size:12.5px;font-weight:700;border-radius:99px;padding:3px 9px;">' + esc(p.sale.label) + '</span>'
        : '';
      return '<div class="p-price"><s style="font-size:15px;font-weight:400;color:var(--muted);">AED ' + esc(p.price) + '</s> AED ' + esc(p.sale.price) + ' <span>' + esc(p.unitLabel) + '</span>' + saleLabel + '</div>';
    }
    return '<div class="p-price">AED ' + esc(p.price) + ' <span>' + esc(p.unitLabel) + '</span></div>';
  }

  const WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function renderOverlayHtml(data) {
    var ov = data.overlay;
    if (!ov || !ov.enabled || !ov.formEndpoint) return '';
    var uM = ov.formEndpoint.match(/[?&]u=([^&]+)/);
    var idM = ov.formEndpoint.match(/[?&]id=([^&]+)/);
    var honeypot = (uM && idM) ? 'b_' + uM[1] + '_' + idM[1] : '';
    return '<div id="sok-overlay" class="sok-overlay" role="dialog" aria-modal="true" aria-labelledby="sok-ov-h">\n' +
      '  <div class="sok-overlay-box">\n' +
      '    <button class="sok-overlay-close" aria-label="Close this popup">×</button>\n' +
      (ov.image ? '    <img src="' + esc(ov.image) + '" alt="" class="sok-overlay-img" loading="lazy">\n' : '') +
      '    <h2 id="sok-ov-h" class="sok-overlay-heading">' + esc(ov.heading) + '</h2>\n' +
      '    <p class="sok-overlay-text">' + esc(ov.text) + '</p>\n' +
      (ov.discountText ? '    <p class="sok-overlay-discount">' + esc(ov.discountText) + '</p>\n' : '') +
      '    <form class="sok-overlay-form" data-mc-form data-endpoint="' + esc(ov.formEndpoint) + '" novalidate>\n' +
      '      <input type="email" name="EMAIL" data-mc-email required autocomplete="email" placeholder="Your email address">\n' +
      (honeypot ? '      <div style="position:absolute;left:-5000px;" aria-hidden="true"><input type="text" name="' + esc(honeypot) + '" tabindex="-1" value=""></div>\n' : '') +
      '      <label class="sok-overlay-consent"><input type="checkbox" name="consent" required>\n' +
      '        I agree to receive occasional emails from ' + esc(data.brand.name) + '.\n' +
      '        See our <a href="' + esc(ov.privacyHref || 'privacy-policy.html') + '">Privacy&nbsp;Policy</a>.\n' +
      '      </label>\n' +
      '      <button type="submit" class="btn btn-primary">' + esc(ov.buttonLabel || 'Subscribe') + '</button>\n' +
      '      <p class="sok-overlay-msg" role="status" aria-live="polite"></p>\n' +
      '    </form>\n' +
      '    <p class="sok-overlay-success" style="display:none;">' + esc(ov.successText || 'Thank you! Check your inbox.') + '</p>\n' +
      '  </div>\n</div>\n';
  }

  /* ---------- shared page chrome ---------- */

  function head(data, page, opts) {
    const b = data.brand, s = data.seo[page.seoKey];
    const url = b.siteUrl + '/' + (page.file === 'index.html' ? '' : page.file);
    let out = '<!DOCTYPE html>\n<html lang="en" dir="ltr">\n<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>' + esc(s.title) + '</title>\n' +
      '  <meta name="description" content="' + esc(s.description) + '">\n' +
      '  <meta name="robots" content="index, follow">\n' +
      '  <link rel="canonical" href="' + esc(url) + '">\n' +
      '  <link rel="alternate" hreflang="en" href="' + esc(url) + '">\n\n' +
      '  <meta property="og:type" content="website">\n' +
      '  <meta property="og:title" content="' + esc(s.ogTitle) + '">\n' +
      '  <meta property="og:description" content="' + esc(s.ogDescription) + '">\n' +
      '  <meta property="og:image" content="' + esc(b.siteUrl + '/' + b.ogImage) + '">\n' +
      '  <meta property="og:url" content="' + esc(url) + '">\n' +
      '  <meta name="twitter:card" content="summary_large_image">\n\n' +
      '  <link rel="icon" type="image/webp" href="' + esc(b.favicon) + '">\n' +
      (opts && opts.appleIcon ? '  <link rel="apple-touch-icon" href="' + esc(b.favicon) + '">\n' : '') +
      (opts && opts.preload ? '  <link rel="preload" as="image" href="' + esc(opts.preload) + '">\n' : '') +
      '  <link rel="stylesheet" href="assets/css/style.css">\n\n';

    if (b.gaId) {
      out += '  <script async src="https://www.googletagmanager.com/gtag/js?id=' + esc(b.gaId) + '"></script>\n' +
        '  <script>\n' +
        '    window.dataLayer = window.dataLayer || [];\n' +
        '    function gtag(){dataLayer.push(arguments);}\n' +
        "    gtag('js', new Date());\n" +
        "    gtag('config', '" + b.gaId + "');\n" +
        '  </script>\n';
    }
    if (b.fbPixelId) {
      out += '  <script>\n' +
        '    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n' +
        '    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;\n' +
        "    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;\n" +
        '    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,\n' +
        "    document,'script','https://connect.facebook.net/en_US/fbevents.js');\n" +
        "    fbq('init','" + b.fbPixelId + "');fbq('track','PageView');\n" +
        '  </script>\n';
    }
    out += '\n' + page.jsonLd + '\n</head>\n';
    return out;
  }

  function header(data, current) {
    const b = data.brand;
    const items = [
      ['index.html', 'Home'], ['products.html', 'Products'], ['recipes.html', 'Recipes'],
      ['blogs.html', 'Blog'], ['index.html#faq', 'FAQ'], ['index.html#contact', 'Contact']
    ];
    const links = items.map(function (it) {
      const cur = it[0] === current ? ' aria-current="page"' : '';
      return '      <a href="' + it[0] + '"' + cur + '>' + it[1] + '</a>';
    }).join('\n');
    return '<body>\n<a class="skip-link" href="#main">Skip to content</a>\n\n' +
      '<header class="site-header">\n' +
      '  <nav class="nav-inner" aria-label="Main navigation">\n' +
      '    <a href="index.html" class="brand" aria-label="' + esc(b.name) + ' — home">\n' +
      '      <img src="' + esc(b.logo) + '" alt="' + esc(b.name) + ' logo" width="40" height="40">\n' +
      '      <span>\n' +
      '        <span class="brand-name">' + esc(b.name) + '</span>\n' +
      '        <span class="brand-tag">' + esc(b.tagline) + '</span>\n' +
      '      </span>\n' +
      '    </a>\n' +
      '    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">☰</button>\n' +
      '    <div class="nav-links" id="nav-links">\n' + links + '\n    </div>\n' +
      '    <a class="btn btn-whatsapp nav-cta-desktop" href="' + esc(waUrl(b)) + '" target="_blank" rel="noopener">Order Now</a>\n' +
      '  </nav>\n</header>\n';
  }

  function footer(data) {
    const b = data.brand, f = data.footer;
    const year = new Date().getFullYear();
    return '<footer class="site-footer">\n' +
      '  <div class="container footer-grid">\n' +
      '    <div>\n' +
      '      <img src="' + esc(b.logo) + '" alt="' + esc(b.name) + ' logo" width="120" height="40" loading="lazy">\n' +
      '      <p>' + esc(f.about) + '</p>\n' +
      '    </div>\n' +
      '    <div>\n      <h3>Navigation</h3>\n      <ul>\n' +
      '        <li><a href="index.html">Home</a></li>\n' +
      '        <li><a href="products.html">Products</a></li>\n' +
      '        <li><a href="recipes.html">Recipes</a></li>\n' +
      '        <li><a href="blogs.html">Blog</a></li>\n' +
      '        <li><a href="index.html#faq">FAQ</a></li>\n' +
      '      </ul>\n    </div>\n' +
      '    <div>\n      <h3>Order &amp; Contact</h3>\n      <ul>\n' +
      '        <li><a href="tel:' + esc(b.phoneTel) + '">' + esc(b.phoneDisplay) + '</a></li>\n' +
      '        <li><a href="mailto:' + esc(b.email) + '">' + esc(b.email) + '</a></li>\n' +
      '        <li><a href="' + esc(waUrl(b)) + '" target="_blank" rel="noopener">Order on WhatsApp</a></li>\n' +
      '      </ul>\n    </div>\n' +
      '  </div>\n' +
      '  <div class="container footer-bottom">\n' +
      '    <span>© ' + year + ' ' + esc(b.name) + '. All rights reserved. · ' + esc(f.locationLine) + '</span>\n' +
      '    <span>' + esc(f.bottomRight) + '</span>\n' +
      '  </div>\n</footer>\n\n' +
      '<a class="float-wa" href="' + esc(waUrl(b)) + '" target="_blank" rel="noopener" aria-label="Chat to order on WhatsApp">\n' +
      '  ' + WA_SVG + '\n</a>\n' +
      '<button class="back-top" aria-label="Back to top">↑</button>\n\n' +
      renderOverlayHtml(data) +
      '<script src="assets/js/main.js" defer></script>\n</body>\n</html>\n';
  }

  function breadcrumbs(label) {
    return '  <div class="container">\n' +
      '    <nav class="breadcrumbs" aria-label="Breadcrumb">\n' +
      '      <ol>\n        <li><a href="index.html">Home</a></li>\n' +
      '        <li aria-current="page">' + esc(label) + '</li>\n      </ol>\n' +
      '    </nav>\n  </div>\n';
  }

  function breadcrumbLd(data, name, file) {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: data.brand.siteUrl + '/' },
        { '@type': 'ListItem', position: 2, name: name, item: data.brand.siteUrl + '/' + file }
      ]
    };
  }

  /* ---------- index.html ---------- */

  function renderIndex(data) {
    const b = data.brand;
    const jsonLd = ld({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization', name: b.name, url: b.siteUrl,
          logo: b.siteUrl + '/' + b.logo, foundingDate: b.foundingYear,
          description: b.orgDescription,
          address: { '@type': 'PostalAddress', addressCountry: 'IN', addressRegion: 'Jammu & Kashmir' },
          contactPoint: { '@type': 'ContactPoint', contactType: 'sales', telephone: b.phoneTel, email: b.email }
        },
        { '@type': 'WebSite', url: b.siteUrl, name: b.name },
        {
          '@type': 'FAQPage',
          mainEntity: data.faq.items.map(function (f) {
            return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: plainMd(f.a) } };
          })
        }
      ]
    });

    const h = data.hero;
    const hero =
      '  <!-- Hero -->\n  <section class="hero">\n    <div class="container hero-grid">\n      <div>\n' +
      '        <span class="eyebrow">' + esc(h.eyebrow) + '</span>\n' +
      '        <h1>' + esc(h.title) + '</h1>\n' +
      '        <p class="lead">' + esc(h.lead) + '</p>\n' +
      '        <div class="hero-cta">\n' +
      '          <a class="btn btn-primary" href="' + esc(h.primaryCta.href) + '">' + esc(h.primaryCta.label) + '</a>\n' +
      '          <a class="btn btn-whatsapp" href="' + esc(waUrl(b)) + '" target="_blank" rel="noopener">\n' +
      '            ' + WA_SVG + '\n            ' + esc(h.waCtaLabel) + '\n          </a>\n' +
      '        </div>\n' +
      '        <ul class="hero-points">\n' +
      h.points.map(function (p) { return '          <li>' + esc(p) + '</li>'; }).join('\n') + '\n' +
      '        </ul>\n      </div>\n' +
      '      <div class="hero-img">\n' +
      '        <img src="' + esc(h.image) + '" alt="' + esc(h.imageAlt) + '" width="600" height="600" fetchpriority="high">\n' +
      '      </div>\n    </div>\n  </section>\n';

    const w = data.whyUs;
    const why =
      '\n  <!-- Why us -->\n  <section class="section-alt">\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(w.eyebrow) + '</span>\n' +
      '      <h2>' + esc(w.heading) + '</h2>\n      <div class="grid-4">\n' +
      w.cards.map(function (c) {
        return '        <div class="card feature-card">\n' +
          '          <div class="feature-icon" aria-hidden="true">' + esc(c.icon) + '</div>\n' +
          '          <h3>' + esc(c.title) + '</h3>\n' +
          '          <p>' + esc(c.text) + '</p>\n        </div>';
      }).join('\n') +
      '\n      </div>\n    </div>\n  </section>\n';

    const hp = data.homeProducts;
    const featured = data.products.filter(function (p) { return p.featured; });
    const teaser =
      '\n  <!-- Products teaser -->\n  <section>\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(hp.eyebrow) + '</span>\n' +
      '      <h2>' + esc(hp.heading) + '</h2>\n' +
      '      <p class="section-sub">' + esc(hp.sub) + '</p>\n      <div class="grid-3">\n' +
      featured.map(function (p) {
        return '        <article class="card product-card">\n' +
          '          <div class="p-img">\n' +
          '            <img src="' + esc(p.image) + '" alt="' + esc(p.imageAlt) + '" loading="lazy" width="400" height="300">\n' +
          '            <span class="weight-badge">' + esc(p.badge) + '</span>\n' +
          statusBadge(p.status) + '\n          </div>\n' +
          '          <div class="p-body">\n' +
          '            <h3>' + esc(p.name) + '</h3>\n' +
          '            <p class="p-desc">' + esc(p.homeDesc || p.pageDesc) + '</p>\n' +
          productPriceHtml(p) + '\n' +
          '            <a class="btn btn-whatsapp" href="' + esc(waUrl(b, p.waText)) + '" target="_blank" rel="noopener">' + (p.status === 'out_of_stock' ? 'Ask about restock' : 'Order on WhatsApp') + '</a>\n' +
          '          </div>\n        </article>';
      }).join('\n') +
      '\n      </div>\n' +
      '      <p class="center" style="margin-top:28px;"><a class="btn btn-outline" href="products.html">' + esc(hp.viewAllLabel) + '</a></p>\n' +
      '    </div>\n  </section>\n';

    const hw = data.howItWorks;
    const how =
      '\n  <!-- How ordering works -->\n  <section class="section-alt">\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(hw.eyebrow) + '</span>\n' +
      '      <h2>' + esc(hw.heading) + '</h2>\n      <div class="grid-3">\n' +
      hw.steps.map(function (s, i) {
        return '        <div class="step">\n' +
          '          <span class="step-num">' + (i + 1) + '</span>\n' +
          '          <h3>' + esc(s.title) + '</h3>\n' +
          '          <p>' + esc(s.text) + '</p>\n        </div>';
      }).join('\n') +
      '\n      </div>\n    </div>\n  </section>\n';

    const st = data.story;
    const story =
      '\n  <!-- Story -->\n  <section>\n    <div class="container hero-grid">\n' +
      '      <div class="hero-img">\n' +
      '        <img src="' + esc(st.image) + '" alt="' + esc(st.imageAlt) + '" loading="lazy" width="600" height="600">\n' +
      '      </div>\n      <div>\n' +
      '        <span class="eyebrow">' + esc(st.eyebrow) + '</span>\n' +
      '        <h2>' + esc(st.heading) + '</h2>\n' +
      st.paragraphs.map(function (p) { return '        <p>' + esc(p) + '</p>'; }).join('\n') + '\n' +
      '        <p><a href="' + esc(st.linkHref) + '">' + esc(st.linkLabel) + '</a></p>\n' +
      '      </div>\n    </div>\n  </section>\n';

    const t = data.testimonials;
    const testi =
      '\n  <!-- Testimonials -->\n  <section class="section-alt">\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(t.eyebrow) + '</span>\n' +
      '      <h2>' + esc(t.heading) + '</h2>\n      <div class="grid-3">\n' +
      t.items.map(function (q) {
        const stars = '★'.repeat(Math.max(1, Math.min(5, q.stars || 5)));
        return '        <div class="card">\n' +
          '          <div class="stars" aria-label="' + (q.stars || 5) + ' out of 5 stars">' + stars + '</div>\n' +
          '          <p class="quote">' + esc(q.quote) + '</p>\n' +
          '          <div class="quote-by">' + esc(q.name) + '</div>\n        </div>';
      }).join('\n') +
      '\n      </div>\n    </div>\n  </section>\n';

    const fq = data.faq;
    const faq =
      '\n  <!-- FAQ -->\n  <section id="faq">\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(fq.eyebrow) + '</span>\n' +
      '      <h2>' + esc(fq.heading) + '</h2>\n' +
      '      <div class="faq" style="max-width:760px;">\n' +
      fq.items.map(function (f) {
        return '        <details>\n          <summary>' + esc(f.q) + '</summary>\n' +
          '          <p>' + inlineMd(b, f.a) + '</p>\n        </details>';
      }).join('\n') +
      '\n      </div>\n    </div>\n  </section>\n';

    const c = data.contact;
    const contact =
      '\n  <!-- Contact -->\n  <section class="contact-strip" id="contact">\n    <div class="container grid-2">\n' +
      '      <div>\n        <h2>' + esc(c.heading) + '</h2>\n' +
      '        <p>' + esc(c.text) + '</p>\n      </div>\n' +
      '      <ul class="contact-list">\n' +
      '        <li>📞 Phone / WhatsApp: <a href="tel:' + esc(b.phoneTel) + '">' + esc(b.phoneDisplay) + '</a></li>\n' +
      '        <li>✉️ Email: <a href="mailto:' + esc(b.email) + '">' + esc(b.email) + '</a></li>\n' +
      '        <li>📸 Instagram: <a href="https://www.instagram.com/' + esc(b.instagramUser) + '" target="_blank" rel="noopener">@' + esc(b.instagramUser) + '</a></li>\n' +
      '        <li>📍 Origin: ' + esc(c.originLine) + '</li>\n' +
      '      </ul>\n    </div>\n  </section>\n';

    return head(data, { seoKey: 'home', file: 'index.html', jsonLd: jsonLd }, { appleIcon: true, preload: h.image }) +
      header(data, 'index.html') +
      '\n<main id="main">\n\n' + hero + why + teaser + how + story + testi + faq + contact + '\n</main>\n\n' +
      footer(data);
  }

  /* ---------- products.html ---------- */

  function renderProducts(data) {
    const b = data.brand, pp = data.productsPage;
    const jsonLd = ld({
      '@context': 'https://schema.org',
      '@graph': [breadcrumbLd(data, 'Products', 'products.html')].concat(
        data.products.map(function (p) {
          return {
            '@type': 'Product', name: p.schemaName || p.name,
            image: b.siteUrl + '/' + p.image,
            description: p.schemaDesc || p.pageDesc,
            brand: { '@type': 'Brand', name: b.name },
            offers: {
              '@type': 'Offer', priceCurrency: 'AED',
              price: String(p.sale && typeof p.sale.price === 'number' ? p.sale.price : p.price),
              availability: statusAvailability(p.status), url: b.siteUrl + '/products.html'
            }
          };
        })
      )
    });

    const filterBtns =
      '      <div class="filter-bar" data-filter-bar data-filter-target="#products-grid" role="group" aria-label="Filter products">\n' +
      '        <button class="filter-btn" data-filter="all" aria-pressed="true">' + esc(pp.allLabel) + '</button>\n' +
      pp.filters.map(function (f) {
        return '        <button class="filter-btn" data-filter="' + esc(f.key) + '" aria-pressed="false">' + esc(f.label) + '</button>';
      }).join('\n') + '\n      </div>\n';

    const cards = data.products.map(function (p) {
      let specs = '';
      if (p.specs && p.specs.length) {
        specs = '            <details class="specs">\n              <summary>Details</summary>\n              <dl>\n' +
          p.specs.map(function (s) {
            return '                <div class="spec-row"><dt>' + esc(s.label) + '</dt><dd>' + esc(s.value) + '</dd></div>';
          }).join('\n') +
          '\n              </dl>\n            </details>\n';
      }
      return '        <article class="card product-card" data-category="' + esc(p.category) + '">\n' +
        '          <div class="p-img">\n' +
        '            <img src="' + esc(p.image) + '" alt="' + esc(p.imageAlt) + '" loading="lazy" width="400" height="300">\n' +
        '            <span class="weight-badge">' + esc(p.badge) + '</span>\n' +
        statusBadge(p.status) + '\n          </div>\n' +
        '          <div class="p-body">\n' +
        '            <h3>' + esc(p.name) + '</h3>\n' +
        '            <p class="p-desc">' + esc(p.pageDesc) + '</p>\n' +
        productPriceHtml(p) + '\n' +
        '            <a class="btn btn-whatsapp" href="' + esc(waUrl(b, p.waText)) + '" target="_blank" rel="noopener">' + (p.status === 'out_of_stock' ? 'Ask about restock' : 'Order on WhatsApp') + '</a>\n' +
        specs +
        '          </div>\n        </article>';
    }).join('\n\n');

    const compareRows = data.products.filter(function (p) { return p.compare; }).map(function (p) {
      const perGram = p.compare.grams ? 'AED ' + Math.round(p.price / p.compare.grams) + '/g' : '—';
      return '            <tr><td>' + esc(p.compare.label) + '</td><td>AED ' + esc(p.price) + '</td><td>' + perGram + '</td><td>' + esc(p.compare.servings) + '</td><td>' + esc(p.compare.bestFor) + '</td></tr>';
    }).join('\n');

    const compare =
      '\n  <!-- Size comparison -->\n  <section class="section-alt">\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(pp.compare.eyebrow) + '</span>\n' +
      '      <h2>' + esc(pp.compare.heading) + '</h2>\n' +
      '      <div class="table-wrap">\n        <table class="compare">\n          <thead>\n' +
      '            <tr><th scope="col">Tin</th><th scope="col">Price</th><th scope="col">Per gram</th><th scope="col">Servings</th><th scope="col">Best for</th></tr>\n' +
      '          </thead>\n          <tbody>\n' + compareRows + '\n          </tbody>\n        </table>\n      </div>\n' +
      '    </div>\n  </section>\n';

    const idn = pp.identify;
    const identify =
      '\n  <!-- Identify real saffron -->\n  <section id="identify">\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(idn.eyebrow) + '</span>\n' +
      '      <h2>' + esc(idn.heading) + '</h2>\n' +
      '      <p class="section-sub">' + esc(idn.sub) + '</p>\n      <div class="grid-3">\n' +
      idn.steps.map(function (s, i) {
        return '        <div class="step">\n          <span class="step-num">' + (i + 1) + '</span>\n' +
          '          <h3>' + esc(s.title) + '</h3>\n          <p>' + esc(s.text) + '</p>\n        </div>';
      }).join('\n') +
      '\n      </div>\n' +
      '      <p style="margin-top:24px;"><a href="' + esc(idn.footerLink.href) + '">' + esc(idn.footerLink.label) + '</a></p>\n' +
      '    </div>\n  </section>\n';

    const del = pp.delivery;
    const delivery =
      '\n  <!-- Delivery & payment -->\n  <section class="section-alt">\n    <div class="container">\n' +
      '      <span class="eyebrow">' + esc(del.eyebrow) + '</span>\n' +
      '      <h2>' + esc(del.heading) + '</h2>\n      <div class="grid-3">\n' +
      del.cards.map(function (c) {
        return '        <div class="card feature-card">\n' +
          '          <div class="feature-icon" aria-hidden="true">' + esc(c.icon) + '</div>\n' +
          '          <h3>' + esc(c.title) + '</h3>\n' +
          '          <p>' + inlineMd(b, c.text) + '</p>\n        </div>';
      }).join('\n') +
      '\n      </div>\n    </div>\n  </section>\n';

    return head(data, { seoKey: 'products', file: 'products.html', jsonLd: jsonLd }) +
      header(data, 'products.html') +
      '\n<main id="main">\n' + breadcrumbs('Products') +
      '\n  <section style="padding-top:24px;">\n    <div class="container">\n' +
      '      <h1>' + esc(pp.h1) + '</h1>\n' +
      '      <p class="section-sub">' + esc(pp.sub) + '</p>\n\n' +
      filterBtns + '\n      <div class="grid-3" id="products-grid">\n' + cards + '\n      </div>\n' +
      '    </div>\n  </section>\n' +
      compare + identify + delivery + '</main>\n\n' +
      footer(data);
  }

  /* ---------- recipes.html ---------- */

  function renderRecipes(data) {
    const b = data.brand, rp = data.recipesPage;
    const jsonLd = ld({
      '@context': 'https://schema.org',
      '@graph': [breadcrumbLd(data, 'Recipes', 'recipes.html')].concat(
        data.recipes.map(function (r) {
          return {
            '@type': 'Recipe', name: r.schemaName || r.name,
            image: b.siteUrl + '/' + r.image,
            description: r.schemaDesc || r.cardDesc,
            totalTime: r.totalISO, recipeYield: r.yield, recipeCuisine: r.cuisine,
            recipeIngredient: r.ingredients.map(plainMd),
            recipeInstructions: r.steps.map(function (s) { return { '@type': 'HowToStep', text: plainMd(s) }; }),
            author: { '@type': 'Organization', name: b.name }
          };
        })
      )
    });

    const cards = data.recipes.map(function (r, i) {
      return '        <!-- ' + (i + 1) + '. ' + r.name + ' -->\n' +
        '        <article class="card recipe-card">\n' +
        '          <div class="p-img"><img src="' + esc(r.image) + '" alt="' + esc(r.imageAlt) + '" loading="lazy" width="400" height="250"></div>\n' +
        '          <div class="recipe-body">\n' +
        '            <div class="recipe-meta"><span>⏱ ' + esc(r.timeLabel) + '</span><span>' + esc(r.cuisineLabel) + '</span><span>' + esc(r.servesLabel) + '</span></div>\n' +
        '            <h2 style="font-size:22px;margin:0;">' + esc(r.name) + '</h2>\n' +
        '            <p>' + esc(r.cardDesc) + '</p>\n' +
        '            <details class="recipe-detail">\n' +
        '              <summary>View full recipe</summary>\n' +
        '              <h4>Ingredients</h4>\n              <ul>\n' +
        r.ingredients.map(function (x) { return '                <li>' + inlineMd(b, x) + '</li>'; }).join('\n') +
        '\n              </ul>\n              <h4>Method</h4>\n              <ol>\n' +
        r.steps.map(function (x) { return '                <li>' + inlineMd(b, x) + '</li>'; }).join('\n') +
        '\n              </ol>\n' +
        '              <p class="recipe-tip">' + inlineMd(b, r.tip) + '</p>\n' +
        '              <button class="print-btn" type="button">🖨 Print recipe</button>\n' +
        '            </details>\n          </div>\n        </article>';
    }).join('\n\n');

    const g = rp.golden;
    const golden =
      '\n  <!-- Golden rule -->\n  <section class="section-alt">\n    <div class="container center">\n' +
      '      <span class="eyebrow">' + esc(g.eyebrow) + '</span>\n' +
      '      <h2>' + esc(g.heading) + '</h2>\n' +
      '      <p class="section-sub">' + esc(g.sub) + '</p>\n      <p>\n' +
      '        <a class="btn btn-primary" href="' + esc(g.primary.href) + '">' + esc(g.primary.label) + '</a>\n' +
      '        &nbsp;\n' +
      '        <a class="btn btn-outline" href="' + esc(g.secondary.href) + '">' + esc(g.secondary.label) + '</a>\n' +
      '      </p>\n    </div>\n  </section>\n';

    return head(data, { seoKey: 'recipes', file: 'recipes.html', jsonLd: jsonLd }) +
      header(data, 'recipes.html') +
      '\n<main id="main">\n' + breadcrumbs('Recipes') +
      '\n  <section style="padding-top:24px;">\n    <div class="container">\n' +
      '      <h1>' + esc(rp.h1) + '</h1>\n' +
      '      <p class="section-sub">' + esc(rp.sub) + '</p>\n\n      <div class="grid-3">\n\n' +
      cards + '\n\n      </div>\n    </div>\n  </section>\n' +
      golden + '</main>\n\n' +
      footer(data);
  }

  /* ---------- blogs.html ---------- */

  function renderBlogs(data) {
    const b = data.brand, bp = data.blogPage;
    const catLabel = {};
    bp.categories.forEach(function (c) { catLabel[c.key] = c.postLabel || c.label; });

    const jsonLd = ld({
      '@context': 'https://schema.org',
      '@graph': [breadcrumbLd(data, 'Blog', 'blogs.html')].concat(
        data.posts.map(function (p) {
          return {
            '@type': 'BlogPosting', headline: p.title, datePublished: p.dateISO,
            author: { '@type': 'Organization', name: b.name },
            publisher: { '@type': 'Organization', name: b.name },
            url: b.siteUrl + '/blogs.html#' + p.id
          };
        })
      )
    });

    const filterBtns =
      '      <div class="filter-bar" data-filter-bar data-filter-target="#blog-list" role="group" aria-label="Filter articles">\n' +
      '        <button class="filter-btn" data-filter="all" aria-pressed="true">' + esc(bp.allLabel) + '</button>\n' +
      bp.categories.map(function (c) {
        return '        <button class="filter-btn" data-filter="' + esc(c.key) + '" aria-pressed="false">' + esc(c.label) + '</button>';
      }).join('\n') + '\n      </div>\n';

    const articles = data.posts.map(function (p) {
      return '          <article class="card blog-card" data-category="' + esc(p.categoryKey) + '" id="' + esc(p.id) + '">\n' +
        '            <div class="blog-meta"><span class="cat">' + esc(catLabel[p.categoryKey] || p.categoryKey) + '</span><time datetime="' + esc(p.dateISO) + '">' + esc(p.dateDisplay) + '</time></div>\n' +
        '            <h2>' + esc(p.title) + '</h2>\n' +
        '            <p class="excerpt">' + esc(p.excerpt) + '</p>\n' +
        '            <details class="read-more">\n' +
        '              <summary>Read full article</summary>\n' +
        bodyToHtml(b, p.body) + '\n' +
        '            </details>\n          </article>';
    }).join('\n\n');

    const sb = bp.sidebar;
    const sidebar =
      '        <aside class="sidebar" aria-label="Blog sidebar">\n' +
      '          <div class="card">\n' +
      '            <h3>' + esc(sb.orderHeading) + '</h3>\n' +
      '            <p style="color:var(--muted);font-size:15px;margin:8px 0 4px;">' + esc(sb.orderText) + '</p>\n' +
      '            <div class="p-price" style="margin-bottom:12px;">AED ' + esc(sb.priceAmount) + ' <span>' + esc(sb.priceUnit) + '</span></div>\n' +
      '            <a class="btn btn-whatsapp" style="width:100%;" href="' + esc(waUrl(b, sb.waText)) + '" target="_blank" rel="noopener">' + esc(sb.waLabel) + '</a>\n' +
      '          </div>\n' +
      '          <div class="card">\n' +
      '            <h3>' + esc(sb.alsoHeading) + '</h3>\n            <ul>\n' +
      sb.links.map(function (l) { return '              <li><a href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>'; }).join('\n') +
      '\n            </ul>\n          </div>\n        </aside>\n';

    return head(data, { seoKey: 'blog', file: 'blogs.html', jsonLd: jsonLd }) +
      header(data, 'blogs.html') +
      '\n<main id="main">\n' + breadcrumbs('Blog') +
      '\n  <section style="padding-top:24px;">\n    <div class="container">\n' +
      '      <h1>' + esc(bp.h1) + '</h1>\n' +
      '      <p class="section-sub">' + esc(bp.sub) + '</p>\n\n' +
      filterBtns + '\n      <div class="blog-layout">\n        <div id="blog-list">\n\n' +
      articles + '\n\n        </div>\n\n' + sidebar +
      '      </div>\n    </div>\n  </section>\n</main>\n\n' +
      footer(data);
  }

  /* ---------- 404.html & sitemap.xml ---------- */

  function render404(data) {
    const n = data.notFound, b = data.brand;
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
      '  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>Page Not Found | ' + esc(b.name) + '</title>\n' +
      '  <meta name="robots" content="noindex">\n' +
      '  <link rel="icon" type="image/webp" href="' + esc(b.favicon) + '">\n' +
      '  <link rel="stylesheet" href="assets/css/style.css">\n</head>\n<body>\n' +
      '<main style="min-height:70vh;display:flex;align-items:center;">\n' +
      '  <div class="container center">\n' +
      '    <h1>' + esc(n.title) + '</h1>\n' +
      '    <p class="section-sub" style="margin:0 auto 24px;">' + esc(n.text) + '</p>\n' +
      '    <p>\n      <a class="btn btn-primary" href="' + esc(n.primary.href) + '">' + esc(n.primary.label) + '</a>\n' +
      '      &nbsp;\n      <a class="btn btn-outline" href="' + esc(n.secondary.href) + '">' + esc(n.secondary.label) + '</a>\n' +
      '    </p>\n  </div>\n</main>\n</body>\n</html>\n';
  }

  function renderPrivacyPolicy(data) {
    var b = data.brand;
    var url = b.siteUrl + '/privacy-policy.html';
    var year = new Date().getFullYear();
    var jsonLd = ld({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Privacy Policy', url: url, publisher: { '@type': 'Organization', name: b.name } });
    var gaBlock = b.gaId
      ? '  <script async src="https://www.googletagmanager.com/gtag/js?id=' + esc(b.gaId) + '"></script>\n' +
        '  <script>\n    window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}\n' +
        "    gtag('js',new Date());gtag('config','" + b.gaId + "');\n  </script>\n"
      : '';
    return '<!DOCTYPE html>\n<html lang="en" dir="ltr">\n<head>\n' +
      '  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>Privacy Policy | ' + esc(b.name) + '</title>\n' +
      '  <meta name="description" content="Privacy policy for ' + esc(b.name) + ' — how we collect, use and protect your information.">\n' +
      '  <meta name="robots" content="index, follow">\n' +
      '  <link rel="canonical" href="' + esc(url) + '">\n' +
      '  <meta property="og:type" content="website">\n' +
      '  <meta property="og:title" content="Privacy Policy | ' + esc(b.name) + '">\n' +
      '  <meta property="og:url" content="' + esc(url) + '">\n' +
      '  <link rel="icon" type="image/webp" href="' + esc(b.favicon) + '">\n' +
      '  <link rel="stylesheet" href="assets/css/style.css">\n' +
      gaBlock +
      jsonLd + '\n</head>\n' +
      header(data, '') +
      '\n<main id="main">\n' + breadcrumbs('Privacy Policy') +
      '\n  <section style="padding-top:24px;">\n    <div class="container" style="max-width:760px;">\n' +
      '      <h1>Privacy Policy</h1>\n' +
      '      <p style="color:var(--muted);font-size:14px;">Last updated: ' + year + '</p>\n\n' +
      '      <h2>Who we are</h2>\n' +
      '      <p>' + esc(b.name) + ' sells premium Kashmiri Mongra saffron and related products online. Our website is <a href="' + esc(b.siteUrl) + '">' + esc(b.siteUrl) + '</a>.</p>\n\n' +
      '      <h2>What information we collect</h2>\n' +
      '      <p>We collect your <strong>email address</strong> only if you voluntarily subscribe through the opt-in form on this website. We do not collect any other personal data through the site. Orders placed via WhatsApp are handled through WhatsApp\'s own platform.</p>\n\n' +
      '      <h2>How we use your information</h2>\n' +
      '      <p>Your email address is used solely to send you occasional promotional emails — discount offers, new product announcements, and saffron guides. We will never sell, rent, or share your email address with third parties for their own marketing.</p>\n\n' +
      '      <h2>Email service provider</h2>\n' +
      '      <p>We use <strong>Mailchimp</strong> (The Rocket Science Group LLC, USA) to manage our mailing list and send emails. Your email address is stored on Mailchimp\'s servers. You can read <a href="https://mailchimp.com/legal/privacy/" target="_blank" rel="noopener">Mailchimp\'s privacy policy</a>.</p>\n\n' +
      '      <h2>Your rights</h2>\n' +
      '      <p>You may <strong>unsubscribe at any time</strong> via the link in any email we send. To request access to, correction of, or deletion of your data, email us at <a href="mailto:' + esc(b.email) + '">' + esc(b.email) + '</a>.</p>\n\n' +
      (b.gaId
        ? '      <h2>Analytics</h2>\n      <p>We use Google Analytics to understand how visitors use this site. It uses cookies to collect anonymous usage data. You can opt out via the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics opt-out add-on</a>.</p>\n\n'
        : '') +
      '      <h2>Contact</h2>\n' +
      '      <p>Questions? Email <a href="mailto:' + esc(b.email) + '">' + esc(b.email) + '</a> or message us on <a href="' + esc(waUrl(b)) + '" target="_blank" rel="noopener">WhatsApp</a>.</p>\n' +
      '    </div>\n  </section>\n</main>\n\n' +
      footer(data);
  }

  function renderSitemap(data, dateStr) {
    const d = dateStr || new Date().toISOString().slice(0, 10);
    const u = data.brand.siteUrl;
    function url(loc, freq, pri) {
      return '  <url>\n    <loc>' + loc + '</loc>\n    <lastmod>' + d + '</lastmod>\n' +
        '    <changefreq>' + freq + '</changefreq>\n    <priority>' + pri + '</priority>\n  </url>';
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      url(u + '/', 'weekly', '1.0') + '\n' +
      url(u + '/products.html', 'weekly', '0.9') + '\n' +
      url(u + '/recipes.html', 'monthly', '0.8') + '\n' +
      url(u + '/blogs.html', 'monthly', '0.8') + '\n' +
      url(u + '/privacy-policy.html', 'yearly', '0.3') + '\n' +
      '</urlset>\n';
  }

  function renderLlms(data) {
    var b = data.brand;
    var u = b.siteUrl;
    return '# ' + b.name + '\n\n' +
      '> ' + b.orgDescription + '\n\n' +
      '## Pages\n\n' +
      '- [Home](' + u + '/): Products, ordering information, FAQ, and the brand story.\n' +
      '- [Products](' + u + '/products.html): Full product catalogue — Mongra saffron tins, saffron honey, saffron oil, and Kashmiri Kahwa blend.\n' +
      '- [Recipes](' + u + '/recipes.html): Tested saffron recipes including Kashmiri Kahwa, Zafrani Pulao, Kesar Doodh, Arabic Machboos, Saffron Panna Cotta, and Saffron Lemonade.\n' +
      '- [Blog](' + u + '/blogs.html): Guides on Mongra saffron grades, purity testing, Pampore heritage, Arabic cuisine, and research-backed health benefits.\n';
  }

  /* ---------- public API ---------- */

  function renderAll(data) {
    return {
      'index.html': renderIndex(data),
      'products.html': renderProducts(data),
      'recipes.html': renderRecipes(data),
      'blogs.html': renderBlogs(data),
      '404.html': render404(data),
      'sitemap.xml': renderSitemap(data),
      'llms.txt': renderLlms(data),
      'privacy-policy.html': renderPrivacyPolicy(data)
    };
  }

  return {
    esc: esc, waUrl: waUrl, inlineMd: inlineMd, plainMd: plainMd,
    renderIndex: renderIndex, renderProducts: renderProducts,
    renderRecipes: renderRecipes, renderBlogs: renderBlogs,
    render404: render404, renderSitemap: renderSitemap,
    renderLlms: renderLlms, renderPrivacyPolicy: renderPrivacyPolicy,
    renderOverlayHtml: renderOverlayHtml, renderAll: renderAll
  };
}));
