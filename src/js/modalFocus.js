import { getLenis } from './smoothScroll.js';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusable(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

export function trapFocus(event, root) {
  if (event.key !== 'Tab') return;
  const items = getFocusable(root);
  if (!items.length) {
    event.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function lockScroll() {
  const y = window.scrollY;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(y, { immediate: true, force: true });
    lenis.stop();
  }
  document.body.classList.add('is-modal-open');
  return y;
}

export function unlockScroll(y) {
  document.body.classList.remove('is-modal-open');
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(y || 0, { immediate: true, force: true });
    lenis.start();
  } else {
    window.scrollTo(0, y || 0);
  }
}
