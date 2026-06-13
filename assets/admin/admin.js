/* ============================================================
   Saffron of Kashmir — Admin app
   Edits data/site-data.json, regenerates the site via
   SOKTemplates, and publishes through the GitHub Contents API.
   No build tools, no server — works from the hosted site or
   from a local copy of this folder.
   ============================================================ */
(function () {
  'use strict';

  const A = SOKTemplates.esc;            // attribute/HTML escaper
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  const LS_CFG = 'sokadmin.cfg';
  const LS_DRAFT = 'sokadmin.draft';
  const DATA_PATH = 'data/site-data.json';
  const PAGE_FILES = ['index.html', 'products.html', 'recipes.html', 'blogs.html', '404.html', 'sitemap.xml'];

  const S = {
    cfg: { owner: '', repo: '', branch: 'main', token: '' },
    data: null,
    baseline: '',
    user: '',
    demo: false,
    section: 'home',
    pendingImagePath: null   // data path waiting for an upload, or '@media'
  };

  /* ================= utilities ================= */

  function cleanJson(obj, space) {
    return JSON.stringify(obj, (k, v) => (k && k.charAt(0) === '_' ? undefined : v), space);
  }
  function clone(obj) { return JSON.parse(cleanJson(obj)); }

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }

  function slugify(s) {
    return String(s || '').toLowerCase().replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
  }
  function dateDisplayFrom(iso) {
    const d = new Date((iso || '') + 'T00:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }

  function siteUrl() {
    return String((S.data && S.data.brand.siteUrl) || '').replace(/\/+$/, '');
  }
  function rawUrl(name) {
    if (!name) return '';
    if (S.demo) return encodeURI(name);
    return 'https://raw.githubusercontent.com/' + S.cfg.owner + '/' + S.cfg.repo + '/' +
      S.cfg.branch + '/' + encodeURIComponent(name);
  }

  /* base64 <-> utf8 */
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64decode(b64) {
    const bin = atob(String(b64).replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ================= GitHub client ================= */

  async function gh(path, opts) {
    opts = opts || {};
    const res = await fetch('https://api.github.com' + path, Object.assign({}, opts, {
      headers: Object.assign({
        'Authorization': 'Bearer ' + S.cfg.token,
        'Accept': 'application/vnd.github+json'
      }, opts.headers || {})
    }));
    if (!res.ok) {
      let msg = res.status + '';
      try { msg = (await res.json()).message || msg; } catch (e) { /* ignore */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function repoPath(p) {
    return '/repos/' + S.cfg.owner + '/' + S.cfg.repo + '/contents/' +
      p.split('/').map(encodeURIComponent).join('/');
  }

  async function getFile(path) {
    const j = await gh(repoPath(path) + '?ref=' + encodeURIComponent(S.cfg.branch));
    return { sha: j.sha, text: j.content != null ? b64decode(j.content) : null };
  }

  async function putFile(path, contentB64, message, sha) {
    const body = { message: message, content: contentB64, branch: S.cfg.branch };
    if (sha) body.sha = sha;
    try {
      return await gh(repoPath(path), { method: 'PUT', body: JSON.stringify(body) });
    } catch (e) {
      if (e.status === 409 || e.status === 422) {          // sha out of date → refetch once
        try {
          const cur = await gh(repoPath(path) + '?ref=' + encodeURIComponent(S.cfg.branch));
          body.sha = cur.sha;
          return await gh(repoPath(path), { method: 'PUT', body: JSON.stringify(body) });
        } catch (e2) { throw e2.status === 404 ? e : e2; }
      }
      throw e;
    }
  }

  /* ================= state / drafts ================= */

  function draftKey() { return S.cfg.owner + '/' + S.cfg.repo; }

  let draftTimer = null;
  function scheduleDraft() {
    if (S.demo) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        localStorage.setItem(LS_DRAFT, JSON.stringify({
          key: draftKey(), savedAt: new Date().toISOString(), data: clone(S.data)
        }));
      } catch (e) { /* storage full — ignore */ }
    }, 600);
  }
  function clearDraft() { localStorage.removeItem(LS_DRAFT); }

  function isDirty() { return cleanJson(S.data) !== S.baseline; }

  function updateStatus() {
    const chip = $('#status-chip');
    if (S.demo) { chip.textContent = 'Demo mode'; chip.className = 'chip demo'; return; }
    if (isDirty()) { chip.textContent = '● Unpublished changes'; chip.className = 'chip dirty'; }
    else { chip.textContent = '✓ All changes published'; chip.className = 'chip clean'; }
  }

  function markDirty() { updateStatus(); scheduleDraft(); }

  /* ================= field builders ================= */

  function f(label, path, o) {
    o = o || {};
    const val = getPath(S.data, path);
    const hint = o.hint ? '<div class="hint">' + o.hint + '</div>' : '';
    let ctrl;
    if (o.type === 'textarea') {
      ctrl = '<textarea data-path="' + path + '"' +
        (o.coerce ? ' data-coerce="' + o.coerce + '"' : '') +
        ' rows="' + (o.rows || 3) + '">' +
        A(o.coerce === 'lines' ? (val || []).join('\n') : (val == null ? '' : val)) +
        '</textarea>';
    } else if (o.type === 'select') {
      ctrl = '<select data-path="' + path + '"' + (o.coerce ? ' data-coerce="' + o.coerce + '"' : '') + '>' +
        (o.options || []).map(op =>
          '<option value="' + A(op.v) + '"' + (String(op.v) === String(val) ? ' selected' : '') + '>' +
          A(op.l) + '</option>').join('') + '</select>';
    } else if (o.type === 'checkbox') {
      return '<div class="f inline"><input type="checkbox" id="cb-' + path.replace(/\./g, '-') +
        '" data-path="' + path + '"' + (val ? ' checked' : '') + '>' +
        '<label for="cb-' + path.replace(/\./g, '-') + '">' + label + '</label>' + hint + '</div>';
    } else {
      ctrl = '<input type="' + (o.type || 'text') + '" data-path="' + path + '"' +
        (o.coerce ? ' data-coerce="' + o.coerce + '"' : '') +
        ' value="' + A(val == null ? '' : val) + '"' +
        (o.placeholder ? ' placeholder="' + A(o.placeholder) + '"' : '') + '>';
    }
    return '<div class="f"><label>' + label + '</label>' + ctrl + hint + '</div>';
  }

  function num(label, path, o) {
    return f(label, path, Object.assign({ type: 'number', coerce: 'number' }, o));
  }

  function imgField(label, path, o) {
    o = o || {};
    const val = getPath(S.data, path) || '';
    const bg = val ? ' style="background-image:url(\'' + A(rawUrl(val)) + '\')"' : '';
    return '<div class="f"><label>' + label + '</label>' +
      '<div class="imgfield">' +
      '<div class="thumb" data-thumb-for="' + path + '"' + bg + '>' + (val ? '' : 'no image') + '</div>' +
      '<div class="grow"><div class="row">' +
      '<input data-path="' + path + '" data-img value="' + A(val) + '" placeholder="filename.webp">' +
      '<button class="btn btn-outline btn-sm" data-action="upload" data-path="' + path + '" type="button">Upload</button>' +
      '</div>' +
      (o.hint ? '<div class="hint">' + o.hint + '</div>' : '<div class="hint">Filename of an image in the repository (see the Media tab), or upload a new one.</div>') +
      '</div></div></div>';
  }

  function card(icon, title, inner, extra) {
    return '<div class="card"' + (extra || '') + '><h3><span class="ic">' + icon + '</span>' + title + '</h3>' + inner + '</div>';
  }

  const MD_HINT = 'Supports links and emphasis: <code>[text](page.html)</code>, <code>[text](wa:Your WhatsApp message)</code>, <code>**bold**</code>, <code>*italic*</code>.';

  /* ---------- generic list editors ---------- */

  const KINDS = {
    product: {
      label: (it) => (it.name || 'Untitled product'),
      sub: (it) => 'AED ' + (it.price || 0) + ' · ' + (it.category || '—') + (it.featured ? ' · ★ featured' : ''),
      make: () => ({
        _open: true, id: 'new-product', name: 'New Product', badge: '', unitLabel: '/ tin',
        price: 0, image: '', imageAlt: '', homeDesc: '', pageDesc: '',
        schemaName: '', schemaDesc: '',
        status: 'available', sale: null,
        category: (S.data.productsPage.filters[0] || {}).key || 'saffron',
        featured: false,
        waText: "Hi! I'd like to order [product] from " + S.data.brand.name + '.',
        specs: [], compare: null
      })
    },
    recipe: {
      label: (it) => (it.name || 'Untitled recipe'),
      sub: (it) => (it.timeLabel || '') + ' · ' + (it.cuisineLabel || ''),
      make: () => ({
        _open: true, id: 'new-recipe', name: 'New Recipe', schemaName: '', cardDesc: '', schemaDesc: '',
        image: '', imageAlt: '', timeLabel: '30 min', totalISO: 'PT30M',
        cuisineLabel: 'Kashmiri', cuisine: 'Kashmiri', servesLabel: 'Serves 4', yield: '4 servings',
        ingredients: [], steps: [], tip: ''
      })
    },
    post: {
      label: (it) => (it.title || 'Untitled article'),
      sub: (it) => (it.dateDisplay || it.dateISO || ''),
      make: () => {
        const iso = new Date().toISOString().slice(0, 10);
        return {
          _open: true, id: 'new-article', title: 'New article',
          categoryKey: (S.data.blogPage.categories[0] || {}).key || 'guide',
          dateISO: iso, dateDisplay: dateDisplayFrom(iso), excerpt: '', body: ''
        };
      }
    },
    faq: { label: (it) => (it.q || 'New question'), sub: () => '', make: () => ({ _open: true, q: 'New question?', a: '' }) },
    testimonial: {
      label: (it) => (it.name || 'New testimonial'),
      sub: (it) => '★'.repeat(it.stars || 5),
      make: () => ({ _open: true, stars: 5, quote: '', name: '' })
    },
    whycard: { label: (it) => (it.title || 'New card'), sub: () => '', make: () => ({ _open: true, icon: '✨', title: 'New card', text: '' }) },
    step: { label: (it) => (it.title || 'New step'), sub: () => '', make: () => ({ _open: true, title: 'New step', text: '' }) },
    dcard: { label: (it) => (it.title || 'New card'), sub: () => '', make: () => ({ _open: true, icon: '✨', title: 'New card', text: '' }) }
  };

  function listEditor(listPath, kind, bodyFn, addLabel) {
    const arr = getPath(S.data, listPath) || [];
    const K = KINDS[kind];
    const items = arr.map((it, i) => {
      const open = !!it._open;
      const sub = K.sub(it);
      return '<div class="item">' +
        '<div class="item-head" data-action="toggle" data-list="' + listPath + '" data-idx="' + i + '">' +
        '<span>' + (open ? '▾' : '▸') + '</span>' +
        '<span class="ttl">' + A(K.label(it)) + (sub ? ' <span class="sub">— ' + A(sub) + '</span>' : '') + '</span>' +
        '<span class="ctrl">' +
        '<button type="button" title="Move up" data-action="up" data-list="' + listPath + '" data-idx="' + i + '">↑</button>' +
        '<button type="button" title="Move down" data-action="down" data-list="' + listPath + '" data-idx="' + i + '">↓</button>' +
        '<button type="button" title="Duplicate" data-action="dup" data-list="' + listPath + '" data-idx="' + i + '">⧉</button>' +
        '<button type="button" class="del" title="Delete" data-action="del" data-list="' + listPath + '" data-idx="' + i + '">✕</button>' +
        '</span></div>' +
        (open ? '<div class="item-body">' + bodyFn(listPath + '.' + i, it, i) + '</div>' : '') +
        '</div>';
    }).join('');
    return '<div class="items">' + items + '</div>' +
      '<div class="add-row"><button class="btn btn-outline btn-sm" type="button" data-action="add" data-list="' +
      listPath + '" data-kind="' + kind + '">+ ' + (addLabel || 'Add item') + '</button></div>';
  }

  /* compact rows for tiny pair-lists (specs, filters, links, categories) */
  function rowsEditor(listPath, fields, addLabel, defaults) {
    const arr = getPath(S.data, listPath) || [];
    const head = '<div style="display:grid;grid-template-columns:' +
      fields.map(fl => fl.w || '1fr').join(' ') + ' 30px;gap:8px;font-size:12px;color:#8d7c63;margin:8px 0 2px;">' +
      fields.map(fl => '<span>' + fl.label + '</span>').join('') + '<span></span></div>';
    const rows = arr.map((it, i) =>
      '<div style="display:grid;grid-template-columns:' + fields.map(fl => fl.w || '1fr').join(' ') +
      ' 30px;gap:8px;margin:5px 0;align-items:center;">' +
      fields.map(fl =>
        '<input data-path="' + listPath + '.' + i + '.' + fl.key + '" value="' +
        A(it[fl.key] == null ? '' : it[fl.key]) + '"' +
        (fl.placeholder ? ' placeholder="' + A(fl.placeholder) + '"' : '') + '>').join('') +
      '<button type="button" class="btn-ghost" title="Remove" data-action="row-del" data-list="' + listPath +
      '" data-idx="' + i + '">✕</button></div>'
    ).join('');
    return head + rows +
      '<div class="add-row"><button class="btn btn-outline btn-sm" type="button" data-action="row-add" data-list="' +
      listPath + '" data-defaults="' + A(JSON.stringify(defaults)) + '">+ ' + addLabel + '</button></div>';
  }

  /* ================= sections ================= */

  function secHome() {
    const d = S.data;
    return '<div class="page-h"><div><h2>Homepage</h2><p>Everything on the front page, top to bottom.</p></div></div>' +

      card('🌅', 'Hero (top of page)',
        f('Small line above the title', 'hero.eyebrow') +
        f('Main heading (H1)', 'hero.title', { type: 'textarea', rows: 2 }) +
        f('Intro paragraph', 'hero.lead', { type: 'textarea' }) +
        '<div class="grid2">' +
        f('Primary button text', 'hero.primaryCta.label') +
        f('Primary button link', 'hero.primaryCta.href') +
        '</div>' +
        f('WhatsApp button text', 'hero.waCtaLabel') +
        f('Checklist points', 'hero.points', { type: 'textarea', coerce: 'lines', rows: 4, hint: 'One point per line.' }) +
        imgField('Hero image', 'hero.image') +
        f('Hero image description (alt text)', 'hero.imageAlt')) +

      card('🏅', '“Why Choose Us” cards',
        '<div class="grid2">' + f('Small line', 'whyUs.eyebrow') + f('Heading', 'whyUs.heading') + '</div>' +
        listEditor('whyUs.cards', 'whycard', p =>
          '<div class="grid2">' + f('Icon (emoji)', p + '.icon') + f('Title', p + '.title') + '</div>' +
          f('Text', p + '.text', { type: 'textarea' }), 'Add card')) +

      card('🛍️', 'Product showcase strip',
        '<div class="grid2">' + f('Small line', 'homeProducts.eyebrow') + f('Heading', 'homeProducts.heading') + '</div>' +
        f('Subtitle', 'homeProducts.sub', { type: 'textarea', rows: 2 }) +
        f('“View all” button text', 'homeProducts.viewAllLabel') +
        '<div class="hint" style="margin-top:8px;">Products marked <strong>“Show on homepage”</strong> appear here — ' +
        '<a href="#" data-goto="products">manage products →</a></div>') +

      card('🧭', '“How It Works” steps',
        '<div class="grid2">' + f('Small line', 'howItWorks.eyebrow') + f('Heading', 'howItWorks.heading') + '</div>' +
        listEditor('howItWorks.steps', 'step', p =>
          f('Title', p + '.title') + f('Text', p + '.text', { type: 'textarea' }), 'Add step')) +

      card('🏔️', 'Heritage story',
        '<div class="grid2">' + f('Small line', 'story.eyebrow') + f('Heading', 'story.heading') + '</div>' +
        f('Paragraphs', 'story.paragraphs', { type: 'textarea', coerce: 'lines', rows: 7, hint: 'Each line becomes one paragraph.' }) +
        imgField('Image', 'story.image') +
        f('Image description (alt text)', 'story.imageAlt') +
        '<div class="grid2">' + f('Link text', 'story.linkLabel') + f('Link target', 'story.linkHref') + '</div>') +

      card('📞', 'Contact strip',
        f('Heading', 'contact.heading') +
        f('Text', 'contact.text', { type: 'textarea' }) +
        f('Origin line', 'contact.originLine', { hint: 'Phone, email and Instagram in this strip come from <a href="#" data-goto="brand">Brand &amp; contact</a>.' })) +

      card('🦶', 'Footer',
        f('About text', 'footer.about', { type: 'textarea' }) +
        '<div class="grid2">' +
        f('Location line', 'footer.locationLine', { hint: 'Shown as “© YEAR ' + A(d.brand.name) + ' … · location”. The year updates automatically.' }) +
        f('Right-hand line', 'footer.bottomRight') +
        '</div>');
  }

  function secProducts() {
    const filterOpts = S.data.productsPage.filters.map(fl => ({ v: fl.key, l: fl.label + ' (' + fl.key + ')' }));
    return '<div class="page-h"><div><h2>Products</h2><p>Catalogue, prices, WhatsApp messages, spec tables and the products page sections.</p></div></div>' +

      card('📃', 'Page heading',
        f('Page title (H1)', 'productsPage.h1') +
        f('Subtitle', 'productsPage.sub', { type: 'textarea', rows: 2 }) +
        '<div class="subgrp"><div class="lbl">Filter buttons</div>' +
        f('“All” button text', 'productsPage.allLabel') +
        rowsEditor('productsPage.filters',
          [{ key: 'key', label: 'Category key', w: '130px', placeholder: 'saffron' }, { key: 'label', label: 'Button label' }],
          'Add filter', { key: '', label: '' }) +
        '<div class="hint">Each product below is assigned one category key.</div></div>') +

      card('🧺', 'Product catalogue',
        listEditor('products', 'product', (p, it, i) =>
          '<div class="grid2">' + f('Name', p + '.name') + f('Badge on photo', p + '.badge', { placeholder: '5g' }) + '</div>' +
          '<div class="grid3">' +
          num('Price (AED)', p + '.price') +
          f('Unit label', p + '.unitLabel', { placeholder: '/ tin' }) +
          f('Category', p + '.category', { type: 'select', options: filterOpts }) +
          '</div>' +
          f('Availability status', p + '.status', {
            type: 'select',
            options: [
              { v: 'available', l: 'Available (in stock)' },
              { v: 'out_of_stock', l: 'Out of stock' },
              { v: 'coming_soon', l: 'Coming soon (pre-order)' }
            ]
          }) +
          '<div class="subgrp"><div class="lbl">Sale / discount</div>' +
          '<div class="f inline"><input type="checkbox" id="sale-' + i + '" data-action="toggle-sale" data-idx="' + i + '"' +
          (it.sale ? ' checked' : '') + '><label for="sale-' + i + '">This product is on sale</label></div>' +
          (it.sale ?
            '<div class="grid3">' +
            num('Sale price (AED)', p + '.sale.price') +
            f('Label (e.g. 20% off)', p + '.sale.label') +
            f('Valid until', p + '.sale.until', { placeholder: 'YYYY-MM-DD or leave blank', hint: 'Optional — not shown on the site.' }) +
            '</div>'
            : '') +
          '</div>' +
          f('Show on homepage', p + '.featured', { type: 'checkbox' }) +
          imgField('Photo', p + '.image') +
          f('Photo description (alt text)', p + '.imageAlt') +
          f('Description on products page', p + '.pageDesc', { type: 'textarea', rows: 2 }) +
          f('Description on homepage', p + '.homeDesc', { type: 'textarea', rows: 2, hint: 'Used when “Show on homepage” is on. Leave blank to reuse the products-page text.' }) +
          f('Pre-filled WhatsApp message', p + '.waText', { type: 'textarea', rows: 2 }) +
          '<div class="subgrp"><div class="lbl">Details table (optional)</div>' +
          rowsEditor(p + '.specs',
            [{ key: 'label', label: 'Label', w: '140px' }, { key: 'value', label: 'Value' }],
            'Add row', { label: '', value: '' }) + '</div>' +
          '<div class="subgrp"><div class="lbl">Size-comparison table</div>' +
          '<div class="f inline"><input type="checkbox" id="cmp-' + i + '" data-action="toggle-compare" data-idx="' + i + '"' +
          (it.compare ? ' checked' : '') + '><label for="cmp-' + i + '">Include this product in the comparison table</label></div>' +
          (it.compare ?
            '<div class="grid2">' + f('Row label', p + '.compare.label') + num('Grams in pack', p + '.compare.grams', { hint: 'Per-gram price is calculated automatically.' }) + '</div>' +
            '<div class="grid2">' + f('Servings', p + '.compare.servings', { placeholder: '80–100' }) + f('Best for', p + '.compare.bestFor') + '</div>'
            : '') +
          '</div>' +
          '<div class="subgrp"><div class="lbl">Search listing (Google)</div>' +
          '<div class="grid2">' + f('Product name for Google', p + '.schemaName') + '</div>' +
          f('Short description for Google', p + '.schemaDesc', { type: 'textarea', rows: 2 }) + '</div>',
          'Add product')) +

      card('⚖️', 'Comparison section heading',
        '<div class="grid2">' + f('Small line', 'productsPage.compare.eyebrow') + f('Heading', 'productsPage.compare.heading') + '</div>') +

      card('🔍', '“How to identify real saffron”',
        '<div class="grid2">' + f('Small line', 'productsPage.identify.eyebrow') + f('Heading', 'productsPage.identify.heading') + '</div>' +
        f('Subtitle', 'productsPage.identify.sub', { type: 'textarea', rows: 2 }) +
        listEditor('productsPage.identify.steps', 'step', p =>
          f('Title', p + '.title') + f('Text', p + '.text', { type: 'textarea' }), 'Add test') +
        '<div class="grid2">' + f('Footer link text', 'productsPage.identify.footerLink.label') +
        f('Footer link target', 'productsPage.identify.footerLink.href') + '</div>') +

      card('🚚', 'Delivery / payment / bulk cards',
        '<div class="grid2">' + f('Small line', 'productsPage.delivery.eyebrow') + f('Heading', 'productsPage.delivery.heading') + '</div>' +
        listEditor('productsPage.delivery.cards', 'dcard', p =>
          '<div class="grid2">' + f('Icon (emoji)', p + '.icon') + f('Title', p + '.title') + '</div>' +
          f('Text', p + '.text', { type: 'textarea', hint: MD_HINT }), 'Add card'));
  }

  function secRecipes() {
    return '<div class="page-h"><div><h2>Recipes</h2><p>Each recipe also produces Google “Recipe” rich-result data automatically.</p></div></div>' +

      card('📃', 'Page heading',
        f('Page title (H1)', 'recipesPage.h1') +
        f('Subtitle', 'recipesPage.sub', { type: 'textarea', rows: 2 })) +

      card('🍲', 'Recipe collection',
        listEditor('recipes', 'recipe', p =>
          '<div class="grid2">' + f('Recipe name', p + '.name') + f('Time shown on card', p + '.timeLabel', { placeholder: '50 min' }) + '</div>' +
          '<div class="grid2">' + f('Cuisine label', p + '.cuisineLabel') + f('Serves label', p + '.servesLabel', { placeholder: 'Serves 4' }) + '</div>' +
          imgField('Photo', p + '.image') +
          f('Photo description (alt text)', p + '.imageAlt') +
          f('One-line description', p + '.cardDesc', { type: 'textarea', rows: 2 }) +
          f('Ingredients', p + '.ingredients', { type: 'textarea', coerce: 'lines', rows: 8, hint: 'One ingredient per line. ' + MD_HINT }) +
          f('Method', p + '.steps', { type: 'textarea', coerce: 'lines', rows: 8, hint: 'One step per line — numbering is automatic.' }) +
          f('Tip box', p + '.tip', { type: 'textarea', rows: 2, hint: MD_HINT }) +
          '<div class="subgrp"><div class="lbl">Search listing (Google)</div>' +
          '<div class="grid2">' + f('Recipe name for Google', p + '.schemaName') + f('Total time (ISO)', p + '.totalISO', { placeholder: 'PT50M', hint: 'PT15M = 15 min · PT1H30M = 1 hr 30 min.' }) + '</div>' +
          '<div class="grid2">' + f('Cuisine for Google', p + '.cuisine') + f('Yield', p + '.yield', { placeholder: '4 servings' }) + '</div>' +
          f('Short description for Google', p + '.schemaDesc', { type: 'textarea', rows: 2 }) + '</div>',
          'Add recipe')) +

      card('✨', '“Golden rule” banner (bottom of page)',
        '<div class="grid2">' + f('Small line', 'recipesPage.golden.eyebrow') + f('Heading', 'recipesPage.golden.heading') + '</div>' +
        f('Text', 'recipesPage.golden.sub', { type: 'textarea', rows: 3 }) +
        '<div class="grid2">' + f('Primary button text', 'recipesPage.golden.primary.label') + f('Primary button link', 'recipesPage.golden.primary.href') + '</div>' +
        '<div class="grid2">' + f('Secondary button text', 'recipesPage.golden.secondary.label') + f('Secondary button link', 'recipesPage.golden.secondary.href') + '</div>');
  }

  function secPosts() {
    const catOpts = S.data.blogPage.categories.map(c => ({ v: c.key, l: c.label + ' (' + c.key + ')' }));
    return '<div class="page-h"><div><h2>Blog posts</h2><p>Articles open in place on the blog page; each gets its own share link and Google article data.</p></div></div>' +

      card('📃', 'Page heading & categories',
        f('Page title (H1)', 'blogPage.h1') +
        f('Subtitle', 'blogPage.sub', { type: 'textarea', rows: 2 }) +
        '<div class="subgrp"><div class="lbl">Categories</div>' +
        f('“All” button text', 'blogPage.allLabel') +
        rowsEditor('blogPage.categories',
          [{ key: 'key', label: 'Key', w: '110px', placeholder: 'guide' },
           { key: 'label', label: 'Filter button label' },
           { key: 'postLabel', label: 'Label shown on article' }],
          'Add category', { key: '', label: '', postLabel: '' }) + '</div>') +

      card('📰', 'Articles',
        listEditor('posts', 'post', (p, it, i) =>
          f('Title', p + '.title') +
          '<div class="grid2">' +
          '<div class="f"><label>Link id (slug)</label><div style="display:flex;gap:8px;">' +
          '<input data-path="' + p + '.id" value="' + A(it.id) + '" style="flex:1;">' +
          '<button class="btn btn-outline btn-sm" type="button" data-action="slugify" data-idx="' + i + '">From title</button></div>' +
          '<div class="hint">Share link: ' + A(siteUrl()) + '/blogs.html#' + A(it.id) + '</div></div>' +
          f('Category', p + '.categoryKey', { type: 'select', options: catOpts }) +
          '</div>' +
          '<div class="grid2">' +
          '<div class="f"><label>Date</label><div style="display:flex;gap:8px;">' +
          '<input type="date" data-path="' + p + '.dateISO" value="' + A(it.dateISO) + '" style="flex:1;">' +
          '<button class="btn btn-outline btn-sm" type="button" data-action="autodate" data-idx="' + i + '">Format →</button></div></div>' +
          f('Date as shown', p + '.dateDisplay') +
          '</div>' +
          f('Excerpt (shown before “Read full article”)', p + '.excerpt', { type: 'textarea', rows: 3 }) +
          f('Article body', p + '.body', { type: 'textarea', rows: 14, hint: 'Blank line = new paragraph. Start a line with <code>## </code> for a sub-heading. ' + MD_HINT }),
          'Add article')) +

      card('🧷', 'Sidebar',
        f('Order box heading', 'blogPage.sidebar.orderHeading') +
        f('Order box text', 'blogPage.sidebar.orderText', { type: 'textarea', rows: 2 }) +
        '<div class="grid2">' + num('Price shown (AED)', 'blogPage.sidebar.priceAmount') + f('Price unit', 'blogPage.sidebar.priceUnit', { placeholder: '/ 1g tin' }) + '</div>' +
        '<div class="grid2">' + f('Button text', 'blogPage.sidebar.waLabel') + '</div>' +
        f('WhatsApp message', 'blogPage.sidebar.waText', { type: 'textarea', rows: 2 }) +
        '<div class="subgrp"><div class="lbl">Links box</div>' +
        f('Heading', 'blogPage.sidebar.alsoHeading') +
        rowsEditor('blogPage.sidebar.links',
          [{ key: 'label', label: 'Text' }, { key: 'href', label: 'Link', w: '200px' }],
          'Add link', { label: '', href: '' }) + '</div>');
  }

  function secFaq() {
    return '<div class="page-h"><div><h2>FAQs</h2><p>Shown on the homepage, and sent to Google as FAQ rich-result data.</p></div></div>' +
      card('❓', 'Questions',
        '<div class="grid2">' + f('Small line', 'faq.eyebrow') + f('Heading', 'faq.heading') + '</div>' +
        listEditor('faq.items', 'faq', p =>
          f('Question', p + '.q') +
          f('Answer', p + '.a', { type: 'textarea', rows: 3, hint: MD_HINT }), 'Add question'));
  }

  function secTestimonials() {
    return '<div class="page-h"><div><h2>Testimonials</h2><p>Customer quotes on the homepage.</p></div></div>' +
      card('⭐', 'Quotes',
        '<div class="grid2">' + f('Small line', 'testimonials.eyebrow') + f('Heading', 'testimonials.heading') + '</div>' +
        listEditor('testimonials.items', 'testimonial', p =>
          f('Stars', p + '.stars', {
            type: 'select', coerce: 'number',
            options: [5, 4, 3, 2, 1].map(n => ({ v: n, l: '★'.repeat(n) + ' (' + n + ')' }))
          }) +
          f('Quote', p + '.quote', { type: 'textarea', rows: 3 }) +
          f('Name & city', p + '.name', { placeholder: 'Fatima Al-Rashidi, Dubai' }), 'Add testimonial'));
  }

  function secBrand() {
    return '<div class="page-h"><div><h2>Brand &amp; contact</h2><p>Used across every page — header, footer, contact strip, WhatsApp buttons and Google data.</p></div></div>' +
      card('🪪', 'Identity',
        '<div class="grid2">' + f('Brand name', 'brand.name') + f('Tagline under logo', 'brand.tagline') + '</div>' +
        f('Site address', 'brand.siteUrl', { hint: 'No trailing slash. Used for share links, sitemap and Google data.' }) +
        imgField('Logo', 'brand.logo') +
        imgField('Favicon (browser-tab icon)', 'brand.favicon') +
        imgField('Social-share image', 'brand.ogImage', { hint: 'Shown when the site is shared on WhatsApp, Facebook, etc. Ideal size 1200×630.' }) +
        f('Founding year', 'brand.foundingYear') +
        f('Company description for Google', 'brand.orgDescription', { type: 'textarea', rows: 2 })) +
      card('📞', 'Contact details',
        '<div class="grid2">' +
        f('Phone as displayed', 'brand.phoneDisplay', { placeholder: '+91 7006 603060' }) +
        f('Phone for tap-to-call', 'brand.phoneTel', { placeholder: '+917006603060', hint: 'Digits with country code, no spaces.' }) +
        '</div>' +
        f('WhatsApp number', 'brand.whatsappNumber', { placeholder: '917006603060', hint: 'Country code + number, digits only — used in every WhatsApp button.' }) +
        f('Default WhatsApp message', 'brand.defaultWaText', { type: 'textarea', rows: 2 }) +
        '<div class="grid2">' + f('Email', 'brand.email') + f('Instagram username', 'brand.instagramUser', { hint: 'Without the @.' }) + '</div>') +
      card('📈', 'Analytics',
        '<div class="grid2">' +
        f('Google Analytics ID', 'brand.gaId', { placeholder: 'G-XXXXXXXXXX', hint: 'Leave blank to remove Google Analytics.' }) +
        f('Facebook Pixel ID', 'brand.fbPixelId', { hint: 'Leave blank to remove the pixel.' }) +
        '</div>');
  }

  function secSeo() {
    const pages = [['home', 'Home page'], ['products', 'Products page'], ['recipes', 'Recipes page'], ['blog', 'Blog page']];
    return '<div class="page-h"><div><h2>SEO &amp; meta</h2><p>Browser-tab titles, Google snippets, and social-share text for each page.</p></div></div>' +
      pages.map(pg => card('🔎', pg[1],
        f('Browser-tab / Google title', 'seo.' + pg[0] + '.title', { hint: 'Aim for ≤ 60 characters.' }) +
        f('Google description', 'seo.' + pg[0] + '.description', { type: 'textarea', rows: 2, hint: 'Aim for ≤ 160 characters.' }) +
        '<div class="grid2">' + f('Social-share title', 'seo.' + pg[0] + '.ogTitle') + '</div>' +
        f('Social-share description', 'seo.' + pg[0] + '.ogDescription', { type: 'textarea', rows: 2 })
      )).join('');
  }

  function secMedia() {
    return '<div class="page-h"><div><h2>Media</h2><p>Images in the repository. Click a filename to copy it, then paste into any image field.</p></div>' +
      '<button class="btn btn-primary btn-sm" data-action="upload" data-path="@media" type="button">⤴ Upload image</button></div>' +
      (S.demo ? '<div class="banner purple"><div class="grow">Connect with a GitHub token to list and upload images.</div></div>' :
        '<div class="media-grid" id="media-grid"><div style="color:var(--muted);">Loading…</div></div>');
  }

  async function loadMedia() {
    if (S.demo) return;
    const grid = $('#media-grid');
    if (!grid) return;
    try {
      const list = await gh('/repos/' + S.cfg.owner + '/' + S.cfg.repo + '/contents?ref=' + encodeURIComponent(S.cfg.branch));
      const imgs = list.filter(x => x.type === 'file' && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(x.name));
      if (!imgs.length) { grid.innerHTML = '<div style="color:var(--muted);">No images in the repository root yet.</div>'; return; }
      grid.innerHTML = imgs.map(x =>
        '<div class="media-cell">' +
        '<div class="imgbox" style="background-image:url(\'' + A(rawUrl(x.name)) + '?v=' + Date.now() + '\')"></div>' +
        '<div class="nm"><span>' + A(x.name) + '</span>' +
        '<button type="button" title="Copy filename" data-action="copy-name" data-name="' + A(x.name) + '">copy</button>' +
        '</div></div>').join('');
    } catch (e) {
      grid.innerHTML = '<div style="color:var(--danger);">Could not list images: ' + A(e.message) + '</div>';
    }
  }

  function secSettings() {
    const lp = S.data.meta && S.data.meta.lastPublished;
    return '<div class="page-h"><div><h2>Settings</h2><p>Connection, data and safety.</p></div></div>' +
      card('🔗', 'Connection',
        S.demo
          ? '<p style="color:var(--muted);font-size:14px;">Demo mode — not connected to GitHub. <a href="admin.html">Connect with a token</a> to publish changes.</p>'
          : '<p style="font-size:14px;">Connected as <strong>' + A(S.user) + '</strong> to <strong>' + A(S.cfg.owner + '/' + S.cfg.repo) +
            '</strong> on branch <strong>' + A(S.cfg.branch) + '</strong>.' +
            (lp ? '<br>Last published: ' + A(new Date(lp).toLocaleString()) : '') + '</p>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">' +
            '<button class="btn btn-outline btn-sm" data-action="reload-data" type="button">↻ Reload from GitHub (discard local edits)</button>' +
            '<button class="btn btn-outline btn-sm" data-action="backup" type="button">⬇ Download content backup</button>' +
            '<button class="btn btn-danger btn-sm" data-action="disconnect" type="button">Disconnect</button>' +
            '</div>') +
      card('🛡️', 'Security notes',
        '<ul style="margin:6px 0 0 18px;padding:0;font-size:14px;line-height:1.7;color:#4d4136;">' +
        '<li>Your token is saved only in this browser (localStorage), never sent anywhere except api.github.com.</li>' +
        '<li>Use a <strong>fine-grained token</strong> limited to this one repository with <em>Contents: Read &amp; write</em> only.</li>' +
        '<li>You can revoke the token any time in GitHub → Settings → Developer settings.</li>' +
        '<li>This admin page is harmless to outsiders — without a token it cannot change anything.</li>' +
        '</ul>') +
      card('📘', 'Help',
        '<p style="font-size:14px;margin:4px 0;">Step-by-step instructions live in <a href="ADMIN-GUIDE.md" target="_blank" rel="noopener">ADMIN-GUIDE.md</a> in your site folder. ' +
        'Developers can also rebuild pages locally with <code>node build.js</code>.</p>');
  }

  function secDashboard() {
    const d = S.data;
    const b = d.brand;
    const siteU = siteUrl();
    const lp = d.meta && d.meta.lastPublished;
    const products = d.products || [];
    const posts = d.posts || [];

    // Quick links
    const gscHref = 'https://search.google.com/search-console?resource_id=' + encodeURIComponent(siteU + '/');
    const psiHref = 'https://pagespeed.web.dev/report?url=' + encodeURIComponent(siteU + '/');

    const quickLinks = card('🔗', 'Quick links',
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px;">' +
      (b.gaId
        ? '<a class="btn btn-outline btn-sm" href="https://analytics.google.com/" target="_blank" rel="noopener">📊 Google Analytics ↗</a>'
        : '<span style="font-size:13.5px;color:var(--muted);align-self:center;">Google Analytics — add a GA ID in <a href="#" data-goto="brand">Brand &amp; contact</a> first.</span>') +
      '<a class="btn btn-outline btn-sm" href="' + A(gscHref) + '" target="_blank" rel="noopener">🔎 Search Console ↗</a>' +
      '<a class="btn btn-outline btn-sm" href="' + A(psiHref) + '" target="_blank" rel="noopener">⚡ PageSpeed Insights ↗</a>' +
      '</div>'
    );

    // Stats
    const onSale = products.filter(p => p.sale && typeof p.sale.price === 'number');
    const outOfStock = products.filter(p => p.status === 'out_of_stock');
    const comingSoon = products.filter(p => p.status === 'coming_soon');

    function statRow(label, value) {
      return '<tr>' +
        '<td style="padding:8px 0;border-bottom:1px dashed var(--line);color:var(--muted);width:180px;font-size:14px;">' + label + '</td>' +
        '<td style="padding:8px 0;border-bottom:1px dashed var(--line);font-size:14px;font-weight:600;">' + value + '</td>' +
        '</tr>';
    }

    function pill(name, bg, color) {
      return '<span style="background:' + bg + ';color:' + color + ';border-radius:4px;padding:1px 7px;font-size:13px;font-weight:600;margin-right:4px;">' + A(name) + '</span>';
    }

    const statsHtml = card('📊', 'Site stats',
      '<table style="width:100%;border-collapse:collapse;">' +
      statRow('Products', products.length) +
      statRow('On sale', onSale.length || '—') +
      statRow('Out of stock', outOfStock.length ? outOfStock.map(p => pill(p.name, '#fcebed', 'var(--danger)')).join('') : '—') +
      statRow('Coming soon', comingSoon.length ? comingSoon.map(p => pill(p.name, '#fdf6e7', '#7c5a12')).join('') : '—') +
      statRow('Blog posts', posts.length) +
      statRow('Last published', lp ? A(new Date(lp).toLocaleString()) : '<span style="color:var(--muted);">Never</span>') +
      '</table>'
    );

    // Content QA
    const issues = [];

    products.forEach(p => {
      const nm = '<strong>' + A(p.name) + '</strong>';
      if (!p.image) issues.push('Product ' + nm + ': no image set.');
      if (p.image && !p.imageAlt) issues.push('Product ' + nm + ': image has no alt text.');
      if (p.sale && !p.sale.until) issues.push('Product ' + nm + ': on sale with no "valid until" date set.');
    });

    [['home', 'Home'], ['products', 'Products'], ['recipes', 'Recipes'], ['blog', 'Blog']].forEach(([key, label]) => {
      const s = d.seo && d.seo[key];
      if (s) {
        if (!s.title) issues.push('<strong>' + label + ' page</strong>: SEO title is empty.');
        if (!s.description) issues.push('<strong>' + label + ' page</strong>: SEO description is empty.');
      }
    });

    posts.forEach(p => {
      const ttl = '<strong>' + A(p.title || p.id) + '</strong>';
      if (!p.excerpt) issues.push('Post ' + ttl + ': excerpt is empty.');
      if (!p.body) issues.push('Post ' + ttl + ': body is empty.');
    });

    const qa = card('✅', 'Content QA',
      issues.length === 0
        ? '<p style="color:var(--ok);font-size:14px;margin:8px 0 0;">✓ All clear — no issues found.</p>'
        : '<ul style="margin:10px 0 0 18px;padding:0;font-size:14px;line-height:1.9;">' +
          issues.map(i => '<li style="color:var(--danger);">⚠ ' + i + '</li>').join('') +
          '</ul>'
    );

    return '<div class="page-h"><div><h2>Dashboard</h2>' +
      '<p>At-a-glance overview — read-only, no API calls, built entirely from your current content.</p></div></div>' +
      quickLinks + statsHtml + qa;
  }

  function secOverlay() {
    const ov = S.data.overlay || {};
    const enabled = ov.enabled;
    const statusNote = enabled
      ? '<p style="background:#e6f9ee;border:1px solid #b2dfca;border-radius:6px;padding:10px 14px;font-size:13.5px;color:#1a6b3a;margin:0 0 16px;">🟢 Overlay is <strong>live</strong>. Visitors who haven\'t seen it yet will see it after 4 seconds or on first scroll.</p>'
      : '<p style="background:#fdf6e7;border:1px solid #e8c96a;border-radius:6px;padding:10px 14px;font-size:13.5px;color:#7c5a12;margin:0 0 16px;">⚠ Overlay is <strong>disabled</strong>. Enable it below once you\'re ready.</p>';
    const toggleCard = card('🎁', 'Overlay status',
      statusNote +
      f('Enable overlay', 'overlay.enabled', { type: 'checkbox' })
    );
    const contentCard = card('✏️', 'Content',
      f('Heading', 'overlay.heading', { placeholder: 'Welcome — 10% Off Your First Order' }) +
      f('Body text', 'overlay.text', { type: 'textarea', rows: 2 }) +
      f('Discount label (shown large)', 'overlay.discountText', { placeholder: '10% off your first order' }) +
      f('Button label', 'overlay.buttonLabel', { placeholder: 'Claim My Discount' }) +
      f('Success message', 'overlay.successText', { placeholder: 'Thank you! Your discount code is on its way — check your inbox.' }) +
      imgField('Optional image (left of form)', 'overlay.image', { hint: 'Leave blank for no image. Use a portrait or square image, max ~400 px wide.' })
    );
    const settingsCard = card('⚙️', 'Settings',
      f('Mailchimp form endpoint', 'overlay.formEndpoint', {
        hint: 'Paste the full URL from your Mailchimp embedded form (the "action" attribute). Must contain /subscribe/post?',
        placeholder: 'https://yourlist.us5.list-manage.com/subscribe/post?u=…&id=…'
      }) +
      f('Privacy policy link (href)', 'overlay.privacyHref', {
        placeholder: 'privacy-policy.html',
        hint: 'Relative path to your privacy policy page.'
      })
    );
    return '<div class="page-h"><div><h2>Discount overlay</h2>' +
      '<p>First-visit email capture — shows after 4 s or first scroll, once per session, never again after subscription.</p></div></div>' +
      toggleCard + contentCard + settingsCard;
  }

  function secCurrencies() {
    const b = S.data.brand;
    const base = b.baseCurrency || 'AED';
    const currs = b.currencies || {};
    const order = ['AED', 'USD', 'INR', 'SAR', 'QAR', 'OMR'];
    const rateRows = order.filter(c => currs[c]).map(c => {
      const cu = currs[c];
      const isBase = c === base;
      return card('💱', cu.name + ' (' + c + ')' + (isBase ? ' — base currency' : ''),
        f('Display symbol', 'brand.currencies.' + c + '.symbol', { placeholder: c }) +
        (isBase
          ? '<p style="font-size:13px;color:var(--muted);margin:4px 0 0;">Rate is always 1 — this is the base.</p>'
          : num('Exchange rate (1 ' + base + ' = ? ' + c + ')', 'brand.currencies.' + c + '.rate', { placeholder: '1.0' })) +
        (isBase
          ? ''
          : num('Price adjustment (%)', 'brand.currencies.' + c + '.markup', {
              placeholder: '0',
              hint: 'Applied on top of the exchange rate. Positive = mark up (e.g. 15 adds 15% for shipping). Negative = mark down (e.g. -20 lowers price by 20%). 0 = pure conversion.'
            })) +
        num('Decimal places', 'brand.currencies.' + c + '.decimals', { placeholder: '2' })
      );
    }).join('');
    return '<div class="page-h"><div><h2>Currencies &amp; rates</h2>' +
      '<p>Rates are applied client-side. Update them whenever exchange rates drift significantly.</p></div></div>' +
      '<div class="card" style="background:#fdf6e7;border-color:#e8c96a;">' +
      '<p style="font-size:13.5px;margin:0;">ℹ Prices are stored in <strong>' + A(base) + '</strong>. All other currencies are converted at the rates below. After changing rates, publish to update the live site.</p>' +
      '</div>' +
      rateRows;
  }

  const SECTIONS = {
    dashboard: secDashboard,
    home: secHome, products: secProducts, recipes: secRecipes, posts: secPosts,
    faq: secFaq, testimonials: secTestimonials, brand: secBrand, seo: secSeo,
    media: secMedia, settings: secSettings, overlay: secOverlay, currencies: secCurrencies
  };

  function render(sec) {
    S.section = sec || S.section;
    $$('#sidenav button').forEach(b => b.classList.toggle('active', b.dataset.sec === S.section));
    $('#panel').innerHTML = SECTIONS[S.section]();
    if (S.section === 'media') loadMedia();
    window.scrollTo(0, 0);
  }
  function rerender() {                      // keep scroll position on structural edits
    const y = window.scrollY;
    $('#panel').innerHTML = SECTIONS[S.section]();
    if (S.section === 'media') loadMedia();
    window.scrollTo(0, y);
  }

  /* ================= events ================= */

  function coerce(el) {
    const c = el.dataset.coerce;
    if (el.type === 'checkbox') return el.checked;
    if (c === 'number') { const n = Number(el.value); return el.value === '' || isNaN(n) ? 0 : n; }
    if (c === 'lines') return el.value.split('\n');
    return el.value;
  }

  document.addEventListener('input', e => {
    const el = e.target;
    if (!el.dataset || !el.dataset.path || S.data == null) return;
    setPath(S.data, el.dataset.path, coerce(el));
    if (el.dataset.img !== undefined) {
      const th = $('[data-thumb-for="' + el.dataset.path + '"]');
      if (th) {
        const v = el.value.trim();
        th.style.backgroundImage = v ? 'url("' + rawUrl(v).replace(/"/g, '\\"') + '")' : '';
        th.textContent = v ? '' : 'no image';
      }
    }
    markDirty();
  });

  document.addEventListener('change', e => {        // tidy line-lists on blur
    const el = e.target;
    if (!el.dataset || !el.dataset.path || S.data == null) return;
    if (el.dataset.coerce === 'lines') {
      const arr = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      setPath(S.data, el.dataset.path, arr);
      el.value = arr.join('\n');
      markDirty();
    }
  });

  document.addEventListener('click', e => {
    /* close preview menu when clicking elsewhere */
    if (!e.target.closest('.menu-wrap')) $('#preview-menu').classList.remove('open');

    const nav = e.target.closest('#sidenav [data-sec]');
    if (nav) { render(nav.dataset.sec); return; }

    const t = e.target.closest('[data-action],[data-goto],[data-preview]');
    if (!t) return;

    if (t.dataset.goto) { e.preventDefault(); render(t.dataset.goto); return; }
    if (t.dataset.preview) { openPreview(t.dataset.preview); $('#preview-menu').classList.remove('open'); return; }

    const act = t.dataset.action;
    const listPath = t.dataset.list;
    const idx = t.dataset.idx != null ? Number(t.dataset.idx) : null;
    const arr = listPath ? getPath(S.data, listPath) : null;

    switch (act) {
      case 'toggle': {
        if (e.target.closest('.ctrl')) return;
        arr[idx]._open = !arr[idx]._open;
        rerender(); break;
      }
      case 'add': {
        arr.forEach(it => { it._open = false; });
        arr.push(KINDS[t.dataset.kind].make());
        markDirty(); rerender();
        break;
      }
      case 'del': {
        if (confirm('Delete this item? You can still undo by not publishing, or via Settings → Reload from GitHub.')) {
          arr.splice(idx, 1); markDirty(); rerender();
        }
        break;
      }
      case 'dup': {
        const cp = clone(arr[idx]); cp._open = true;
        if (cp.id) cp.id = cp.id + '-copy';
        arr.splice(idx + 1, 0, cp); markDirty(); rerender();
        break;
      }
      case 'up': {
        if (idx > 0) { const x = arr.splice(idx, 1)[0]; arr.splice(idx - 1, 0, x); markDirty(); rerender(); }
        break;
      }
      case 'down': {
        if (idx < arr.length - 1) { const x = arr.splice(idx, 1)[0]; arr.splice(idx + 1, 0, x); markDirty(); rerender(); }
        break;
      }
      case 'row-add': {
        arr.push(JSON.parse(t.dataset.defaults)); markDirty(); rerender(); break;
      }
      case 'row-del': {
        arr.splice(idx, 1); markDirty(); rerender(); break;
      }
      case 'toggle-compare': {
        const pItem = S.data.products[idx];
        pItem.compare = t.checked
          ? { label: (pItem.name || '').replace(' — ', ' '), grams: 1, servings: '', bestFor: '' }
          : null;
        markDirty(); rerender();
        break;
      }
      case 'toggle-sale': {
        const pItem = S.data.products[idx];
        pItem.sale = t.checked ? { price: 0, label: '', until: '' } : null;
        markDirty(); rerender();
        break;
      }
      case 'slugify': {
        S.data.posts[idx].id = slugify(S.data.posts[idx].title);
        markDirty(); rerender(); break;
      }
      case 'autodate': {
        S.data.posts[idx].dateDisplay = dateDisplayFrom(S.data.posts[idx].dateISO);
        markDirty(); rerender(); break;
      }
      case 'upload': {
        if (S.demo) { toast('Uploads are disabled in demo mode'); return; }
        S.pendingImagePath = t.dataset.path;
        $('#file-input').click();
        break;
      }
      case 'copy-name': {
        navigator.clipboard.writeText(t.dataset.name).then(
          () => toast('Copied “' + t.dataset.name + '”'),
          () => toast('Copy failed — select it manually'));
        break;
      }
      case 'reload-data': {
        if (confirm('Discard local edits and reload the content currently on GitHub?')) reloadFromGitHub();
        break;
      }
      case 'backup': {
        const blob = new Blob([cleanJson(S.data, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'site-data-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click(); URL.revokeObjectURL(a.href);
        break;
      }
      case 'disconnect': {
        if (confirm('Disconnect this browser? Your token will be removed. Unpublished local edits are kept as a draft.')) {
          localStorage.removeItem(LS_CFG);
          location.hash = ''; location.reload();
        }
        break;
      }
      case 'resume-draft': { applyDraft(); break; }
      case 'discard-draft': { clearDraft(); $('#draft-banner').innerHTML = ''; toast('Draft discarded'); break; }
    }
  });

  /* image upload */
  $('#file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024 &&
        !confirm('This image is ' + (file.size / 1048576).toFixed(1) + ' MB. Large images slow your site down — upload anyway?')) return;

    const name = file.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');
    toast('Uploading ' + name + '…', 60000);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1]);
        r.onerror = () => rej(new Error('Could not read the file'));
        r.readAsDataURL(file);
      });
      let sha = null;
      try {
        const cur = await gh(repoPath(name) + '?ref=' + encodeURIComponent(S.cfg.branch));
        if (!confirm('“' + name + '” already exists in the repository. Replace it?')) { toast('Upload cancelled'); return; }
        sha = cur.sha;
      } catch (err) { if (err.status !== 404) throw err; }
      await putFile(name, b64, 'Upload image ' + name + ' via site admin', sha);
      if (S.pendingImagePath && S.pendingImagePath !== '@media') {
        setPath(S.data, S.pendingImagePath, name);
        markDirty();
      }
      toast('Uploaded ' + name + ' ✓');
      rerender();
    } catch (err) {
      toast('Upload failed: ' + err.message, 5000);
    } finally {
      S.pendingImagePath = null;
    }
  });

  /* preview */
  function openPreview(file) {
    const map = {
      'index.html': SOKTemplates.renderIndex, 'products.html': SOKTemplates.renderProducts,
      'recipes.html': SOKTemplates.renderRecipes, 'blogs.html': SOKTemplates.renderBlogs,
      '404.html': SOKTemplates.render404,
      'privacy-policy.html': SOKTemplates.renderPrivacyPolicy
    };
    try {
      let html = map[file](S.data);
      const base = (S.demo && location.protocol !== 'file:') ? location.href.replace(/admin\.html.*$/, '') : siteUrl() + '/';
      html = html.replace('<head>', '<head><base href="' + base + '">');
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      window.open(url, '_blank');
      toast('Preview opened — images & styles load from your live site; links open live pages.');
    } catch (err) {
      toast('Preview failed: ' + err.message, 5000);
    }
  }

  $('#preview-btn').addEventListener('click', () => $('#preview-menu').classList.toggle('open'));

  /* ================= publish ================= */

  function validate() {
    const d = S.data;
    d.brand.siteUrl = String(d.brand.siteUrl || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\/.+/.test(d.brand.siteUrl)) return 'Brand & contact → Site address must start with https://';
    if (!d.brand.name.trim()) return 'Brand & contact → Brand name is required.';
    if (!d.brand.whatsappNumber.trim()) return 'Brand & contact → WhatsApp number is required.';
    for (const p of d.products) {
      if (!p.name.trim()) return 'Products → every product needs a name.';
      if (typeof p.price !== 'number' || p.price < 0) return 'Products → “' + p.name + '” needs a valid price.';
    }
    const ids = {};
    for (const post of d.posts) {
      if (!/^[a-z0-9-]+$/.test(post.id)) return 'Blog posts → “' + post.title + '”: the link id may only contain lowercase letters, numbers and dashes (use the “From title” button).';
      if (ids[post.id]) return 'Blog posts → two articles share the link id “' + post.id + '”. Make them unique.';
      ids[post.id] = 1;
    }
    return null;
  }

  function pubRowsHtml(files) {
    return Object.keys(files).map(p =>
      '<div class="pub-row" data-file="' + p + '"><span>' + p + '</span><span class="st">queued</span></div>'
    ).join('');
  }
  function setRow(p, txt, cls) {
    const r = $('.pub-row[data-file="' + p + '"] .st');
    if (r) { r.textContent = txt; r.className = 'st ' + (cls || ''); }
  }

  let publishing = false;

  function openPublish() {
    if (S.demo) { toast('Publishing is disabled in demo mode — connect with a GitHub token.'); return; }
    const err = validate();
    if (err) { toast(err, 6000); return; }
    const files = SOKTemplates.renderAll(S.data);
    $('#pub-rows').innerHTML = pubRowsHtml(Object.assign({}, files, { [DATA_PATH]: 1 }));
    $('#pub-note').style.display = 'none';
    $('#pub-go').disabled = false;
    $('#pub-go').textContent = 'Publish now';
    $('#pub-overlay').classList.add('open');
  }

  async function runPublish() {
    if (publishing) return;
    publishing = true;
    $('#pub-go').disabled = true;
    $('#pub-go').textContent = 'Publishing…';
    $('#pub-cancel').disabled = true;

    S.data.meta = S.data.meta || {};
    S.data.meta.lastPublished = new Date().toISOString();

    const files = SOKTemplates.renderAll(S.data);
    files[DATA_PATH] = cleanJson(S.data, 2) + '\n';

    let failed = 0, written = 0;
    for (const path of Object.keys(files)) {
      setRow(path, 'checking…', 'run');
      try {
        let sha = null, existing = null;
        try {
          const cur = await getFile(path);
          sha = cur.sha; existing = cur.text;
        } catch (err) { if (err.status !== 404) throw err; }
        if (existing === files[path]) { setRow(path, 'no changes', 'skip'); continue; }
        setRow(path, 'uploading…', 'run');
        await putFile(path, b64encode(files[path]), 'Update ' + path + ' via site admin', sha);
        setRow(path, 'published ✓', 'ok'); written++;
      } catch (err) {
        failed++;
        setRow(path, 'failed — ' + err.message, 'err');
        if (err.status === 401 || err.status === 403) break;   // auth problem: stop
      }
    }

    const note = $('#pub-note');
    note.style.display = 'block';
    if (failed === 0) {
      S.baseline = cleanJson(S.data);
      clearDraft();
      updateStatus();
      note.innerHTML = written === 0
        ? 'Everything was already up to date — nothing to publish.'
        : '<strong>Done!</strong> GitHub Pages is now redeploying (usually under a minute). ' +
          'If the live site still shows old content, your Cloudflare cache may need a few minutes — ' +
          'or purge it in the Cloudflare dashboard (Caching → Purge Everything).';
    } else {
      note.innerHTML = '<strong style="color:var(--danger);">' + failed + ' file(s) failed.</strong> ' +
        'Check that your token has <em>Contents: Read &amp; write</em> for this repository, then press Publish again — successful files are skipped automatically.';
    }
    $('#pub-go').disabled = false;
    $('#pub-go').textContent = 'Publish again';
    $('#pub-cancel').disabled = false;
    publishing = false;
  }

  $('#publish-btn').addEventListener('click', openPublish);
  $('#pub-go').addEventListener('click', runPublish);
  $('#pub-cancel').addEventListener('click', () => { if (!publishing) $('#pub-overlay').classList.remove('open'); });

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      toast('Edits autosave as a draft in this browser — use Publish to go live.');
    }
  });

  window.addEventListener('beforeunload', e => {
    if (!S.demo && S.data && isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= connect / boot ================= */

  function enterApp() {
    $('#login').style.display = 'none';
    $('#app').style.display = 'block';
    $('#repo-chip').textContent = S.demo ? 'demo data' : S.cfg.owner + '/' + S.cfg.repo + ' @ ' + S.cfg.branch;
    $('#open-site').href = siteUrl() || '#';
    if (S.demo) {
      $('#draft-banner').innerHTML =
        '<div class="banner purple" style="margin:14px 18px 0;"><div class="grow">' +
        '<strong>Demo mode.</strong> Edit freely and use Preview — changes live only in this tab. ' +
        'Connect with a GitHub token to publish for real.</div>' +
        '<a class="btn btn-outline btn-sm" href="admin.html">Connect</a></div>';
    }
    render('home');
    updateStatus();
  }

  function showDraftBanner(savedAt) {
    $('#draft-banner').innerHTML =
      '<div class="banner" style="margin:14px 18px 0;"><div class="grow">' +
      '<strong>Unpublished draft found</strong> from ' + A(new Date(savedAt).toLocaleString()) +
      ' — saved automatically in this browser.</div>' +
      '<button class="btn btn-primary btn-sm" data-action="resume-draft" type="button">Resume draft</button>' +
      '<button class="btn btn-outline btn-sm" data-action="discard-draft" type="button">Discard</button></div>';
  }
  function applyDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_DRAFT));
      S.data = d.data;
      $('#draft-banner').innerHTML = '';
      markDirty(); render(S.section);
      toast('Draft restored — publish when ready');
    } catch (e) { toast('Could not restore the draft'); }
  }

  async function reloadFromGitHub() {
    try {
      const df = await getFile(DATA_PATH);
      S.data = JSON.parse(df.text);
      S.baseline = cleanJson(S.data);
      clearDraft();
      $('#draft-banner').innerHTML = '';
      render(S.section); updateStatus();
      toast('Reloaded from GitHub');
    } catch (e) { toast('Reload failed: ' + e.message, 5000); }
  }

  async function connect(cfg, silent) {
    S.cfg = cfg; S.demo = false;
    const errBox = $('#login-err');
    try {
      const me = await gh('/user');
      S.user = me.login;
      await gh('/repos/' + cfg.owner + '/' + cfg.repo);
      const df = await getFile(DATA_PATH);
      S.data = JSON.parse(df.text);
      S.baseline = cleanJson(S.data);
      localStorage.setItem(LS_CFG, JSON.stringify(cfg));
      enterApp();
      /* offer stored draft if newer/different */
      try {
        const d = JSON.parse(localStorage.getItem(LS_DRAFT));
        if (d && d.key === draftKey() && cleanJson(d.data) !== S.baseline) showDraftBanner(d.savedAt);
      } catch (e) { /* no draft */ }
    } catch (err) {
      let msg = err.message;
      if (err.status === 401) msg = 'GitHub rejected the token. Check it was copied fully and has not expired.';
      else if (err.status === 404 && msg.toLowerCase().includes('not found'))
        msg = 'Could not find “' + cfg.owner + '/' + cfg.repo + '” or “' + DATA_PATH + '” on branch “' + cfg.branch +
          '”. Make sure the website package (including the data folder) is uploaded to the repository, and the token can access it.';
      if (silent) {
        $('#login').style.display = 'flex'; $('#app').style.display = 'none';
      }
      errBox.textContent = msg;
      errBox.style.display = 'block';
      throw err;
    }
  }

  $('#connect-btn').addEventListener('click', async () => {
    const cfg = {
      owner: $('#in-owner').value.trim(),
      repo: $('#in-repo').value.trim(),
      branch: $('#in-branch').value.trim() || 'main',
      token: $('#in-token').value.trim()
    };
    const errBox = $('#login-err');
    errBox.style.display = 'none';
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      errBox.textContent = 'Please fill in the owner, repository and token.';
      errBox.style.display = 'block';
      return;
    }
    const btn = $('#connect-btn');
    btn.disabled = true; btn.textContent = 'Connecting…';
    try { await connect(cfg, false); } catch (e) { /* shown in errBox */ }
    btn.disabled = false; btn.textContent = 'Connect →';
  });

  $('#try-demo').addEventListener('click', e => {
    e.preventDefault();
    location.hash = '#demo';
    location.reload();
  });

  async function initDemo() {
    S.demo = true;
    try {
      const res = await fetch('data/site-data.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      S.data = await res.json();
      S.baseline = cleanJson(S.data);
      enterApp();
    } catch (err) {
      $('#login-err').textContent =
        'Demo mode needs to load data/site-data.json from the same folder — open this page from your hosted site (yoursite.com/admin.html#demo) or via a local web server.';
      $('#login-err').style.display = 'block';
      location.hash = '';
    }
  }

  function boot() {
    /* prefill from stored config or a github.io guess */
    let cfg = null;
    try { cfg = JSON.parse(localStorage.getItem(LS_CFG)); } catch (e) { /* ignore */ }
    if (cfg) {
      $('#in-owner').value = cfg.owner || '';
      $('#in-repo').value = cfg.repo || '';
      $('#in-branch').value = cfg.branch || 'main';
      $('#in-token').value = cfg.token || '';
    } else if (location.hostname.endsWith('.github.io')) {
      const owner = location.hostname.split('.')[0];
      $('#in-owner').value = owner;
      $('#in-repo').value = location.hostname;
    }

    if (location.hash === '#demo') { initDemo(); return; }
    if (cfg && cfg.token) {
      connect(cfg, true).catch(() => { /* falls back to login with error shown */ });
    }
  }

  boot();
})();
