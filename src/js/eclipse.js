/** Eclipse finale — STEP 4: controls + cleanup. Footer logo is the trigger. */

import gsap from 'gsap';
import { buildOverlay } from './eclipseDom.js';
import { createEclipseStars } from './eclipseStars.js';
import { buildReducedTimeline, buildTimeline, resetVisuals } from './eclipseTimeline.js';
import { getLenis } from './smoothScroll.js';
import { prefersReducedMotion } from './utils.js';

export const ENABLE_ECLIPSE = true;
export const AUTO_TRIGGER_AT_BOTTOM = false;

const FADE_OUT = 0.8;
const AUTO_HOLD_MS = 2500;

const FALLBACK = {
  button: 'Завершити розклад',
  title: 'Розклад завершено',
  restart: 'Почати знову',
  tagline: "П'ять людей. П'ять арканів. Один розклад.",
};

/** Footer moon-card trigger; full eclipse controls for STEP 3. */
export function initEclipse({ site, finale } = {}) {
  if (!ENABLE_ECLIPSE) return;

  const copy = {
    button: finale?.eclipse?.button || FALLBACK.button,
    title: finale?.eclipse?.title || FALLBACK.title,
    restart: finale?.eclipse?.restart || FALLBACK.restart,
    tagline: site?.tagline || FALLBACK.tagline,
  };

  const logo = document.querySelector('.site-footer .logo-mark--footer');
  if (!logo) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'eclipse-logo-btn';
  trigger.setAttribute('aria-label', copy.button);
  logo.replaceWith(trigger);
  trigger.append(logo);

  const overlay = buildOverlay(copy);
  overlay.hidden = true;
  document.body.append(overlay);

  const els = {
    veil: overlay.querySelector('.eclipse__veil'),
    sun: overlay.querySelector('.eclipse__sun'),
    corona: overlay.querySelector('.eclipse__corona'),
    moon: overlay.querySelector('.eclipse__moon'),
    stars: overlay.querySelector('.eclipse__stars'),
    letters: [...overlay.querySelectorAll('.eclipse__letter')],
    subtitle: overlay.querySelector('.eclipse__subtitle'),
    badge: overlay.querySelector('.eclipse__logo'),
    restart: overlay.querySelector('.eclipse__restart'),
  };

  const pageBits = [
    document.querySelector('main'),
    document.querySelector('.site-header'),
    document.querySelector('.site-footer'),
  ].filter(Boolean);
  const starField = createEclipseStars(els.stars);

  let playing = false;
  let atEnd = false;
  let closing = false;
  let timeline = null;
  let autoTimer = 0;

  const syncModal = () => {
    const locked = document.body.classList.contains('is-modal-open');
    trigger.disabled = locked || playing || closing;
    trigger.setAttribute('aria-disabled', trigger.disabled ? 'true' : 'false');
  };
  syncModal();
  new MutationObserver(syncModal).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });

  const canStart = () =>
    !playing && !closing && !document.body.classList.contains('is-modal-open');

  const markEnd = () => {
    atEnd = true;
    gsap.set(els.moon, { clearProps: 'willChange' });
  };

  const start = () => {
    if (!canStart()) return;
    clearTimeout(autoTimer);
    autoTimer = 0;
    playing = true;
    atEnd = false;
    syncModal();
    gsap.killTweensOf(overlay);
    overlay.hidden = false;
    gsap.set(overlay, { opacity: 1 });
    resetVisuals(els);
    lockPage(pageBits);
    const reduced = prefersReducedMotion();
    starField.start(!reduced);
    timeline = reduced
      ? buildReducedTimeline(els, pageBits, markEnd)
      : buildTimeline(els, pageBits, markEnd);
  };

  // Esc during play jumps to end; at end state Esc is a no-op until restart.
  const skipToEnd = () => {
    if (overlay.hidden || closing || !timeline || atEnd) return;
    timeline.progress(1);
  };

  const restart = () => {
    if (overlay.hidden || closing) return;
    closing = true;
    syncModal();
    timeline?.kill();
    timeline = null;
    starField.stop();
    gsap.killTweensOf([overlay, ...pageBits, els.moon].filter(Boolean));
    gsap.set(els.moon, { clearProps: 'willChange' });

    const finish = () => {
      overlay.hidden = true;
      gsap.set(overlay, { clearProps: 'opacity' });
      unlockPage(pageBits);
      gsap.set(pageBits, { clearProps: 'opacity' });
      resetVisuals(els);
      playing = false;
      atEnd = false;
      closing = false;
      syncModal();
      scrollToTop();
      trigger.focus({ preventScroll: true });
    };

    gsap.to(overlay, {
      opacity: 0,
      duration: prefersReducedMotion() ? 0 : FADE_OUT,
      ease: 'power2.inOut',
      onComplete: finish,
    });
  };

  trigger.addEventListener('click', start);
  els.restart.addEventListener('click', restart);
  document.addEventListener('keydown', (event) => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      skipToEnd();
      return;
    }
    if (event.key === 'r' || event.key === 'R') {
      if (event.target?.matches?.('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      restart();
    }
  });
  window.addEventListener('resize', () => {
    if (!overlay.hidden) starField.resize();
  });

  if (AUTO_TRIGGER_AT_BOTTOM) {
    const onScroll = () => {
      if (!nearBottom() || !canStart()) {
        clearTimeout(autoTimer);
        autoTimer = 0;
        return;
      }
      if (autoTimer) return;
      autoTimer = window.setTimeout(() => {
        autoTimer = 0;
        if (nearBottom() && canStart()) start();
      }, AUTO_HOLD_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    getLenis()?.on?.('scroll', onScroll);
  }
}

function nearBottom() {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return window.scrollY >= max - 4;
}

function scrollToTop() {
  const reduced = prefersReducedMotion();
  const lenis = getLenis();
  if (lenis) {
    // Re-sync after unlock — Lenis may lag window.scrollY while it was stopped.
    lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    lenis.scrollTo(0, {
      immediate: reduced,
      force: true,
      duration: reduced ? 0 : 1.1,
    });
    return;
  }
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}

function lockPage(bits) {
  document.documentElement.style.overflow = 'hidden';
  getLenis()?.stop();
  bits.forEach((node) => {
    if (node.matches?.('main, .site-header')) {
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('inert', '');
    }
  });
}

function unlockPage(bits) {
  document.documentElement.style.overflow = '';
  getLenis()?.start();
  bits.forEach((node) => {
    if (node.matches?.('main, .site-header')) {
      node.removeAttribute('aria-hidden');
      node.removeAttribute('inert');
    }
  });
}
