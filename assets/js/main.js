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

  // WhatsApp conversion tracking
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="wa.me"]');
    if (!link) return;
    if (typeof gtag !== 'function') return;
    var card = link.closest('article') || link.closest('.card');
    var h3 = card && card.querySelector('h3');
    gtag('event', 'whatsapp_click', { item: h3 ? h3.textContent.trim() : 'general' });
  });

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
