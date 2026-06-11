/* ═══════════════════════════════════════════════════════════
   SAFFRON OF KASHMIR — animations.js
   GSAP ScrollTrigger sequences · Chinar leaf draw
   Scroll color transition · Saffron letter effect
═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (typeof gsap === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // ─── SCROLL COLOR TRANSITION (hero → burgundy) ───
  const colorSection = document.querySelector('.scroll-color-section');
  if (colorSection) {
    gsap.to(colorSection, {
      backgroundColor: '#1a040a',
      scrollTrigger: {
        trigger: colorSection,
        start: 'top 80%',
        end: 'top 20%',
        scrub: true
      }
    });
  }

  // ─── CHINAR LEAF SVG DRAW ───
  const chinarLeaf = document.querySelector('.chinar-svg-path');
  if (chinarLeaf) {
    const len = chinarLeaf.getTotalLength ? chinarLeaf.getTotalLength() : 2000;
    gsap.set(chinarLeaf, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(chinarLeaf, {
      strokeDashoffset: 0,
      duration: 2.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: chinarLeaf,
        start: 'top 85%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── STORY SECTION ───
  const storySection = document.querySelector('.story-section');
  if (storySection) {
    gsap.from('.story-quote', {
      opacity: 0,
      x: -60,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: storySection,
        start: 'top 75%',
        toggleActions: 'play none none reset'
      }
    });

    gsap.from('.story-body-text', {
      opacity: 0,
      x: 60,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.2,
      scrollTrigger: {
        trigger: storySection,
        start: 'top 75%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── FEATURE CARDS STAGGER ───
  const featureCards = document.querySelectorAll('.feature-card');
  if (featureCards.length) {
    gsap.from(featureCards, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: featureCards[0].parentElement,
        start: 'top 80%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── PRODUCT CARDS STAGGER ───
  const productCards = document.querySelectorAll('.product-card');
  if (productCards.length) {
    gsap.from(productCards, {
      opacity: 0,
      y: 40,
      scale: 0.96,
      duration: 0.7,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: productCards[0].parentElement,
        start: 'top 80%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── BLOG CARDS STAGGER ───
  const blogCards = document.querySelectorAll('.blog-card');
  if (blogCards.length) {
    gsap.from(blogCards, {
      opacity: 0,
      y: 36,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: blogCards[0].parentElement,
        start: 'top 80%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── RECIPE CARDS STAGGER ───
  const recipeCards = document.querySelectorAll('.recipe-card');
  if (recipeCards.length) {
    gsap.from(recipeCards, {
      opacity: 0,
      y: 40,
      duration: 0.7,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: recipeCards[0].closest('.recipe-grid') || recipeCards[0].parentElement,
        start: 'top 80%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── SECTION HEADERS ───
  gsap.utils.toArray('.section-title').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      y: 30,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none reset'
      }
    });
  });

  // ─── GUIDE STEPS ───
  const guideSteps = document.querySelectorAll('.guide-step');
  if (guideSteps.length) {
    gsap.from(guideSteps, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      stagger: 0.18,
      ease: 'back.out(1.2)',
      scrollTrigger: {
        trigger: guideSteps[0].parentElement,
        start: 'top 80%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── TESTIMONIALS ───
  const testimonials = document.querySelectorAll('.testimonial');
  if (testimonials.length) {
    gsap.from(testimonials, {
      opacity: 0,
      x: -30,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: testimonials[0].parentElement,
        start: 'top 80%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── SAFFRON LETTER SCROLL EFFECT ───
  const saffronWord = document.querySelector('.saffron-word');
  if (saffronWord) {
    const text = saffronWord.textContent;
    saffronWord.innerHTML = [...text].map(l => `<span class="letter">${l}</span>`).join('');

    gsap.to('.saffron-word .letter', {
      color: 'var(--antique-gold)',
      stagger: 0.1,
      duration: 0.4,
      ease: 'none',
      scrollTrigger: {
        trigger: saffronWord,
        start: 'top 80%',
        end: 'top 40%',
        scrub: 0.5
      }
    });
  }

  // ─── INSTAGRAM GRID ───
  const instaTiles = document.querySelectorAll('.insta-tile');
  if (instaTiles.length) {
    gsap.from(instaTiles, {
      opacity: 0,
      scale: 0.9,
      duration: 0.5,
      stagger: 0.07,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: instaTiles[0].parentElement,
        start: 'top 85%',
        toggleActions: 'play none none reset'
      }
    });
  }

  // ─── NASTALIQ SEALS ───
  document.querySelectorAll('.nastaliq-seal').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      scale: 0.8,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reset'
      }
    });
  });

  // ─── KHATAMBAND DIVIDERS ───
  document.querySelectorAll('.khatamband-divider').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      scaleX: 0.3,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        toggleActions: 'play none none reset'
      }
    });
  });

})();
