/* ═══════════════════════════════════════════════════════════
   SAFFRON OF KASHMIR — products.js
   Filter · Accordion · Card tilt · Swiper carousel
═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const WA_NUMBER = '917006603060';
  const WA_BASE   = `https://wa.me/${WA_NUMBER}?text=`;

  // ─── PRODUCT FILTER ───
  function initFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards      = document.querySelectorAll('[data-category]');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.getAttribute('data-filter');
        cards.forEach(card => {
          const match = cat === 'all' || card.getAttribute('data-category') === cat;
          card.style.display = match ? '' : 'none';
          if (match) {
            card.style.animation = 'fadeInUp 0.4s ease forwards';
          }
        });
      });
    });
  }

  // ─── ACCORDION ───
  function initAccordions() {
    document.querySelectorAll('.learn-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card    = btn.closest('.product-card');
        const accord  = card?.querySelector('.product-accordion');
        if (!accord) return;

        const isOpen = accord.classList.contains('open');

        // Close all others
        document.querySelectorAll('.product-accordion.open').forEach(a => {
          a.classList.remove('open');
          a.closest('.product-card')?.querySelector('.learn-more-btn')?.classList.remove('open');
        });

        if (!isOpen) {
          accord.classList.add('open');
          btn.classList.add('open');
        }
      });
    });
  }

  // ─── RECIPE DETAIL TOGGLE ───
  function initRecipeToggle() {
    document.querySelectorAll('[data-recipe-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const card   = btn.closest('.recipe-card');
        const detail = card?.querySelector('.recipe-detail');
        if (!detail) return;

        const isOpen = detail.classList.contains('open');
        detail.classList.toggle('open', !isOpen);
        btn.textContent = isOpen ? 'View Recipe →' : 'Close Recipe ↑';
      });
    });
  }

  // ─── BLOG CATEGORY FILTER ───
  function initBlogFilter() {
    const filterBtns = document.querySelectorAll('[data-blog-filter]');
    const cards      = document.querySelectorAll('[data-blog-category]');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.getAttribute('data-blog-filter');
        cards.forEach(card => {
          const match = cat === 'all' || card.getAttribute('data-blog-category') === cat;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  }

  // ─── SWIPER (homepage product teaser) ───
  function initSwiper() {
    if (typeof Swiper === 'undefined') return;

    const el = document.querySelector('.product-swiper');
    if (!el) return;

    new Swiper(el, {
      slidesPerView: 1.15,
      spaceBetween: 16,
      centeredSlides: false,
      loop: false,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
        bulletClass: 'swiper-bullet',
        bulletActiveClass: 'swiper-bullet-active'
      },
      breakpoints: {
        640: { slidesPerView: 1.5 },
        900: { slidesPerView: 3, centeredSlides: false }
      }
    });
  }

  // ─── INIT ───
  document.addEventListener('DOMContentLoaded', () => {
    initFilter();
    initAccordions();
    initRecipeToggle();
    initBlogFilter();
    initSwiper();
  });
})();
