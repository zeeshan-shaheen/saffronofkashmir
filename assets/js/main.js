/* Saffron of Kashmir — main.js (no libraries, ~2 KB) */
(function () {
  'use strict';

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Back to top
  var backTop = document.querySelector('.back-top');
  if (backTop) {
    window.addEventListener('scroll', function () {
      backTop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Generic filter bars (products / blog categories)
  document.querySelectorAll('[data-filter-bar]').forEach(function (bar) {
    var targetSel = bar.getAttribute('data-filter-target');
    var items = document.querySelectorAll(targetSel + ' [data-category]');
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      bar.querySelectorAll('.filter-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      var f = btn.getAttribute('data-filter');
      items.forEach(function (item) {
        var cats = item.getAttribute('data-category').split(' ');
        item.style.display = (f === 'all' || cats.indexOf(f) !== -1) ? '' : 'none';
      });
    });
  });

  // Order attribution.
  // First touch wins: the source that brought a visitor here is recorded once
  // and never overwritten, so a repeat buyer keeps one ref across sessions.
  // Stores only a source label, landing path, timestamp and random code, in
  // this browser. No IP, no fingerprint, no third-party request.
  var SOK_ATTR = (function () {
    var KEY = 'sok_attr';

    // Extend here. Matched case-insensitively as a substring, first hit wins,
    // against the utm_source value and then the referrer hostname.
    var SOURCE_RULES = [
      ['IG', ['instagram']],
      ['FB', ['facebook', 'fb']],
      ['TT', ['tiktok']],
      ['PN', ['pinterest']],
      ['LI', ['linkedin', 'lnkd.in']],
      ['YT', ['youtube', 'youtu.be']],
      ['TH', ['threads']],
      ['GO', ['google']],
      ['SE', ['bing', 'duckduckgo', 'yahoo']]
    ];

    // Deliberately excludes 0 O 1 I L so a code read aloud is unambiguous.
    var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    function lookup(needle) {
      if (!needle) return null;
      var s = String(needle).toLowerCase();
      for (var i = 0; i < SOURCE_RULES.length; i++) {
        var toks = SOURCE_RULES[i][1];
        for (var j = 0; j < toks.length; j++) {
          if (s.indexOf(toks[j]) !== -1) return SOURCE_RULES[i][0];
        }
      }
      return null;
    }

    function resolveSource() {
      var utm = null;
      try { utm = new URLSearchParams(location.search).get('utm_source'); } catch (e) { /* ignore */ }
      if (utm) return lookup(utm) || 'RF';            // tagged but unmapped = referral
      var host = '';
      try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { /* ignore */ }
      if (!host || host === location.hostname) return 'DR';
      return lookup(host) || 'RF';
    }

    // No CSPRNG: omit the ref rather than risk a colliding Math.random code.
    function randomCode(len) {
      if (typeof crypto === 'undefined' || !crypto.getRandomValues) return null;
      var out = '', buf = new Uint8Array(1);
      var limit = 256 - (256 % ALPHABET.length);     // reject above this to stay unbiased
      while (out.length < len) {
        crypto.getRandomValues(buf);
        if (buf[0] >= limit) continue;
        out += ALPHABET.charAt(buf[0] % ALPHABET.length);
      }
      return out;
    }

    function read() {
      try {
        var raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    function init() {
      var existing = read();
      if (existing) return existing;                 // first touch wins
      var src = resolveSource();
      var rec = { src: src, landing: location.pathname, ts: Date.now() };
      var code = randomCode(4);
      if (code) rec.ref = src + '-' + code;
      try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* private mode */ }
      return rec;
    }

    // Append the ref to a wa.me link's message. Idempotent, and rebuilt with
    // encodeURIComponent so encoding matches what templates.js emits.
    function stampLink(a, ref) {
      if (!a || !ref) return false;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('https://wa.me/') !== 0) return false;
      // Links carrying no message of their own (the contact-strip numbers) are
      // left untouched. Stamping them opens WhatsApp with a bare code and no
      // greeting, which reads as a mistake to the customer.
      var q = href.indexOf('?text=');
      if (q === -1) return false;
      var text = '';
      try { text = decodeURIComponent(href.slice(q + 6).replace(/\+/g, '%20')); }
      catch (e) { return false; }
      if (!text) return false;                               // ?text= with nothing after it
      if (text.indexOf('Ref: ' + ref) !== -1) return false;  // already stamped
      a.setAttribute('href', href.slice(0, q) + '?text=' + encodeURIComponent(text + '\n\nRef: ' + ref));
      return true;
    }

    function stampAll(ref) {
      if (!ref) return 0;
      var n = 0;
      document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
        if (stampLink(a, ref)) n++;
      });
      return n;
    }

    var attr = init();
    stampAll(attr && attr.ref);

    // Safety net for anything rendered after load. Capture phase, so the href
    // is corrected before the browser acts on the click.
    document.addEventListener('click', function (e) {
      if (!attr || !attr.ref || !e.target.closest) return;
      var a = e.target.closest('a[href^="https://wa.me/"]');
      if (a) stampLink(a, attr.ref);
    }, true);

    return { get: function () { return attr; }, stampAll: stampAll };
  })();

  // WhatsApp conversion tracking
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="wa.me"]');
    if (!link) return;
    if (typeof gtag !== 'function') return;
    var card = link.closest('article') || link.closest('.card');
    var h3 = card && card.querySelector('h3');
    var attr = SOK_ATTR.get() || {};
    gtag('event', 'whatsapp_click', {
      item: h3 ? h3.textContent.trim() : 'general',   // kept: existing reports depend on it
      ref: attr.ref || '',
      src: attr.src || '',
      product: link.getAttribute('data-wa-product') || (h3 ? h3.textContent.trim() : ''),
      page_path: location.pathname,
      position: link.getAttribute('data-wa-pos') || 'other'
    });
  });

  // Social profile click tracking
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-social]');
    if (!link) return;
    if (typeof gtag !== 'function') return;
    gtag('event', 'social_click', {
      platform: link.getAttribute('data-social'),
      page_path: location.pathname
    });
  });

  // Currency switcher
  (function () {
    var PREF = 'sok_currency';
    var sel = document.getElementById('sok-curr');
    if (!sel) return;

    var COUNTRY_MAP = {
      AE: 'AED', IN: 'INR', US: 'USD', SA: 'SAR', QA: 'QAR', OM: 'OMR',
      GB: 'USD', AU: 'USD', CA: 'USD', PK: 'USD', BD: 'USD',
      NZ: 'USD', SG: 'USD', MY: 'USD', KW: 'AED', BH: 'AED',
      JO: 'USD', EG: 'USD', TR: 'USD', DE: 'USD', FR: 'USD'
    };

    function getCurrData(code) {
      var opt = sel.querySelector('option[value="' + code + '"]');
      if (!opt) return null;
      return {
        code: code,
        rate: parseFloat(opt.dataset.rate),
        symbol: opt.dataset.symbol,
        decimals: parseInt(opt.dataset.decimals, 10),
        markup: parseFloat(opt.dataset.markup || 0)
      };
    }

    function applyRate(code) {
      var curr = getCurrData(code);
      if (!curr) return;
      document.querySelectorAll('[data-price]').forEach(function (el) {
        var aed = parseFloat(el.dataset.price);
        var converted = aed * curr.rate * (1 + curr.markup / 100);
        var formatted;
        try {
          formatted = new Intl.NumberFormat('en', {
            minimumFractionDigits: curr.decimals,
            maximumFractionDigits: curr.decimals
          }).format(converted);
        } catch (e) {
          formatted = converted.toFixed(curr.decimals);
        }
        el.textContent = curr.symbol + ' ' + formatted;
      });
      sel.value = code;
    }

    function setAndSave(code) {
      applyRate(code);
      localStorage.setItem(PREF, code);
    }

    function geoDetect() {
      fetch('https://ipapi.co/json/')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var code = COUNTRY_MAP[d.country_code] || 'USD';
          setAndSave(code);
        })
        .catch(function () { /* stay on AED default */ });
    }

    var saved = localStorage.getItem(PREF);
    if (saved && sel.querySelector('option[value="' + saved + '"]')) {
      applyRate(saved);
    } else {
      geoDetect();
    }

    sel.addEventListener('change', function () {
      setAndSave(sel.value);
    });
  })();

  // First-visit discount overlay
  (function () {
    var el = document.getElementById('sok-overlay');
    if (!el) return;
    var SEEN = 'sok_overlay_seen';
    var DONE = 'sok_overlay_done';
    if (localStorage.getItem(DONE) || sessionStorage.getItem(SEEN)) return;
    function open() {
      el.classList.add('sok-overlay-open');
      var email = el.querySelector('[data-mc-email]');
      if (email) email.focus();
    }
    function close() {
      el.classList.remove('sok-overlay-open');
      sessionStorage.setItem(SEEN, '1');
    }
    var fired = false;
    function trigger() {
      if (fired) return;
      fired = true;
      sessionStorage.setItem(SEEN, '1');
      open();
    }
    var t = setTimeout(trigger, 4000);
    window.addEventListener('scroll', function () { clearTimeout(t); trigger(); }, { passive: true, once: true });
    el.querySelector('.sok-overlay-close').addEventListener('click', close);
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var form = el.querySelector('[data-mc-form]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailEl = form.querySelector('[data-mc-email]');
      var consentEl = form.querySelector('[name="consent"]');
      var msgEl = form.querySelector('.sok-overlay-msg');
      var submitBtn = form.querySelector('[type="submit"]');
      if (!consentEl.checked) { msgEl.textContent = 'Please tick the box to continue.'; return; }
      msgEl.textContent = '';
      submitBtn.disabled = true;
      var url = form.dataset.endpoint.replace('/post?', '/post-json?') +
        '&EMAIL=' + encodeURIComponent(emailEl.value) + '&c=sokMcCb';
      window.sokMcCb = function (res) {
        if (res.result === 'success') {
          form.style.display = 'none';
          var ok = el.querySelector('.sok-overlay-success');
          if (ok) ok.style.display = '';
          localStorage.setItem(DONE, '1');
          setTimeout(close, 3000);
        } else {
          msgEl.textContent = res.msg ? res.msg.replace(/<[^>]+>/g, '').trim() : 'Something went wrong. Please try again.';
          submitBtn.disabled = false;
        }
      };
      var s = document.createElement('script');
      s.src = url;
      s.onerror = function () {
        msgEl.textContent = 'Connection error — please try again.';
        submitBtn.disabled = false;
      };
      document.head.appendChild(s);
    });
  })();

  // Print a single recipe: open its details, print, restore
  document.querySelectorAll('.print-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('article');
      if (!card) { window.print(); return; }
      var clone = card.cloneNode(true);
      clone.querySelectorAll('details').forEach(function (d) { d.open = true; });
      var win = window.open('', '_blank', 'width=800,height=900');
      win.document.write('<html><head><title>Recipe — Saffron of Kashmir</title>' +
        '<style>body{font-family:Georgia,serif;max-width:640px;margin:24px auto;padding:0 16px;color:#222;line-height:1.6}' +
        'img,button,.btn,.print-btn,summary{display:none}h4{text-transform:uppercase;font-size:13px;letter-spacing:.06em;color:#A8842F}</style>' +
        '</head><body>' + clone.innerHTML + '</body></html>');
      win.document.close();
      win.focus();
      win.print();
    });
  });
})();
