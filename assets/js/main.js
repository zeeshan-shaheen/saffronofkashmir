/* ═══════════════════════════════════════════════════════════
   SAFFRON OF KASHMIR — main.js
   Lenis smooth scroll · Nav · Mobile menu · Float WA
   Scroll reveal · Preloader
═══════════════════════════════════════════════════════════ */

const WA_NUMBER = '917006603060';
const WA_BASE   = `https://wa.me/${WA_NUMBER}?text=`;
const WA_MSG    = encodeURIComponent("Hi! I'd like to order from Saffron of Kashmir.");

/* ─── PRELOADER ─── */
function initPreloader() {
  const el = document.getElementById('preloader');
  if (!el) return;
  const bar = el.querySelector('.preloader-bar');
  if (bar) {
    requestAnimationFrame(() => { bar.classList.add('loaded'); });
  }
  setTimeout(() => { el.classList.add('hidden'); }, 1800);
}

/* ─── LENIS SMOOTH SCROLL ─── */
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  const lenis = new Lenis({ lerp: 0.08, smooth: true });

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  window.__lenis = lenis;
}

/* ─── NAV SCROLL ─── */
function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const mq = window.matchMedia('(max-width: 768px)');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });

  // Hamburger
  const ham   = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('nav-overlay');
  if (ham && overlay) {
    ham.addEventListener('click', () => {
      const open = ham.classList.toggle('open');
      overlay.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      ham.setAttribute('aria-expanded', open);
    });

    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        ham.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Active link
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-overlay-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === currentPage || (currentPage === '' && href === 'index.html') || href === './') {
      a.classList.add('active');
    }
  });
}

/* ─── FLOATING WHATSAPP ─── */
function initFloatWA() {
  const btn = document.getElementById('float-wa');
  if (!btn) return;
  btn.href = WA_BASE + WA_MSG;
}

/* ─── SCROLL REVEAL (IntersectionObserver) ─── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => obs.observe(el));
}

/* ─── AOS INIT ─── */
function initAOS() {
  if (typeof AOS === 'undefined') return;
  AOS.init({
    duration: 800,
    easing: 'ease-out-cubic',
    once: true,
    offset: 60,
    disable: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  });
}

/* ─── CARD 3D TILT ─── */
function initCardTilt() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) translateZ(0)';
    });
  });
}

/* ─── WHATSAPP LINKS (dynamic product name) ─── */
function initWALinks() {
  document.querySelectorAll('[data-wa-product]').forEach(btn => {
    const product = btn.getAttribute('data-wa-product');
    const msg = encodeURIComponent(`Hi! I'd like to order ${product} from Saffron of Kashmir.`);
    btn.href = WA_BASE + msg;
  });
}

/* ─── MOBILE PRICE ROW ─── */
function initMobilePriceRow() {
  const row = document.getElementById('mobilePriceRow');
  if (!row) return;
  const mq = window.matchMedia('(max-width: 768px)');
  const update = () => { row.style.display = mq.matches ? 'flex' : 'none'; };
  update();
  mq.addEventListener('change', update);
}

/* ─── VISIBILITY API (pause Three.js) ─── */
document.addEventListener('visibilitychange', () => {
  if (typeof window.__threeHeroAnimId !== 'undefined') {
    if (document.hidden) {
      cancelAnimationFrame(window.__threeHeroAnimId);
    } else {
      if (typeof window.__threeHeroResume === 'function') window.__threeHeroResume();
    }
  }
});

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initLenis();
  initNav();
  initFloatWA();
  initScrollReveal();
  initAOS();
  initCardTilt();
  initWALinks();
  initMobilePriceRow();
});
