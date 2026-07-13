// 28CAPS — motion layer (Phase 5). Vanilla JS, no libraries.
// Adds: (1) IntersectionObserver scroll reveals, (2) a scrolled-header state.
// The optional ambient hero effect is a CSS-only glow drift (in main.css),
// gated behind @media (prefers-reduced-motion: no-preference).
//
// FAIL-SAFE (D7): the reveal hidden state lives ONLY under `html.reveal-ready`,
// a class this script adds solely when JS runs AND motion is allowed.
//   JS disabled     -> class never added -> nothing hidden -> all content visible.
//   Reduced motion  -> initReveals() is skipped -> class never added -> all visible.
//   No IntersectionObserver support -> return before adding class -> all visible.

(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var reduceMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

  // --- Scrolled-header state ---
  // A style change (denser background + shadow), not motion, so it runs
  // regardless of the reduced-motion setting. Uses an observer on the hero
  // instead of a scroll listener to avoid scroll-handler jank.
  function initScrolledHeader() {
    var hero = document.getElementById('hero');
    if (!header || !hero || !('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        header.classList.toggle('is-scrolled', !entries[i].isIntersecting);
      }
    }, { threshold: 0 });
    obs.observe(hero);
  }

  // --- Reveal-on-scroll (only when JS runs AND motion is allowed) ---
  // Stagger a group by counting preceding [data-reveal] element siblings.
  function staggerDelay(el) {
    var i = 0, sib = el.previousElementSibling;
    while (sib) {
      if (sib.hasAttribute('data-reveal')) i++;
      sib = sib.previousElementSibling;
    }
    if (i > 6) i = 6; // cap the stagger so nothing waits too long
    return i * 80;
  }

  function initReveals() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length || !('IntersectionObserver' in window)) return;

    // Commit to the hidden state ONLY now — after confirming JS + observer support
    // (and, at the call site below, that reduced motion is not requested).
    document.documentElement.classList.add('reveal-ready');

    var obs = new IntersectionObserver(function (entries, observer) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isIntersecting) continue;
        var el = entry.target;
        el.style.transitionDelay = staggerDelay(el) + 'ms';
        el.classList.add('is-visible');
        observer.unobserve(el); // fire once
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    for (var j = 0; j < els.length; j++) obs.observe(els[j]);
  }

  // Optional nicety: if the user enables reduced-motion live, drop the hidden
  // state and reveal everything immediately.
  function watchReducedMotionChange() {
    function onChange(e) {
      if (!e.matches) return;
      document.documentElement.classList.remove('reveal-ready');
      var els = document.querySelectorAll('[data-reveal]');
      for (var i = 0; i < els.length; i++) els[i].classList.add('is-visible');
    }
    if (typeof reduceMedia.addEventListener === 'function') {
      reduceMedia.addEventListener('change', onChange);
    } else if (typeof reduceMedia.addListener === 'function') {
      reduceMedia.addListener(onChange); // older Safari
    }
  }

  // --- Mobile nav (hamburger) ---
  // Progressive enhancement: the CSS collapses the mobile panel ONLY under
  // html.js-nav, a class added here. With JS off, the panel is never collapsed,
  // so the nav stays reachable. This is a plain show/hide (display), so it needs
  // no reduced-motion gating and is fully independent of the reveal system.
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var panel = document.getElementById('primary-nav');
    if (!toggle || !panel) return;

    document.documentElement.classList.add('js-nav');

    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Selecting a destination closes the menu.
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // ESC closes the menu and returns focus to the toggle.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  initScrolledHeader();
  initMobileNav();
  if (!reduceMedia.matches) {
    initReveals();
  }
  watchReducedMotionChange();
})();
