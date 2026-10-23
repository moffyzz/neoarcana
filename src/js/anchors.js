/** In-page hash links via Lenis when smooth scroll is active. */

import { getLenis } from './smoothScroll.js';

const ANCHOR_DURATION = 1.2;

function isPrimaryClick(event) {
  return event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}

function resolveHashTarget(hash) {
  if (!hash || hash === '#' || hash.startsWith('#/')) return null;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return null;
  return document.getElementById(id);
}

function focusTarget(el) {
  if (!(el instanceof HTMLElement)) return;
  const focusable = el.matches(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable && !el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
}

/**
 * Lenis already applies CSS scroll-margin-top (verified: ~20px gap under header
 * for #deck / #team with no extra offset).
 */
function scrollToHash(hash, { immediate = false, focus = false } = {}) {
  const lenis = getLenis();
  if (!lenis) return null;
  const target = resolveHashTarget(hash);
  if (!target) return null;

  lenis.scrollTo(target, {
    duration: immediate ? undefined : ANCHOR_DURATION,
    immediate,
  });
  if (focus) focusTarget(target);
  return target;
}

function onClick(event) {
  if (!isPrimaryClick(event)) return;
  if (!getLenis()) return;

  const link = event.target instanceof Element
    ? event.target.closest('a[href^="#"]')
    : null;
  if (!link || !document.contains(link)) return;
  if (link.hasAttribute('download') || link.hasAttribute('target')) return;

  const href = link.getAttribute('href');
  if (!href || href === '#' || href.startsWith('#/')) return;

  const target = resolveHashTarget(href);
  if (!target) return;

  event.preventDefault();
  scrollToHash(href, { immediate: false, focus: true });
  history.replaceState(null, '', href);
}

/** Correct landing when the page opens with an in-page hash (not #/card/...). */
export function settleLocationHash() {
  const hash = location.hash;
  if (!hash || hash === '#' || hash.startsWith('#/')) return;
  scrollToHash(hash, { immediate: true, focus: false });
}

export function initAnchors() {
  document.addEventListener('click', onClick);
}
