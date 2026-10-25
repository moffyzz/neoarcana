/** Desktop (≥1024) two-state scroll: measure, wheel, keyboard glide. No cue UI. */

import { prefersReducedMotion } from './utils.js';

const DESKTOP = '(min-width: 1024px)';
const TWO_STATE_RATIO = 0.8;
const EDGE = 2;
const GLIDE_MS = 600;
const WHEEL_LOCK_MS = 700;
const DELTA_MIN = 4;

let panel;
let body;
let sheetScroll;
let desktopMq;
let cachedScrollHeight = 0;
let cachedClientHeight = 0;
let scrollRaf = 0;
let glideRaf = 0;
let glideToken = 0;
let wheelLockUntil = 0;
let wheelLockTimer = 0;

export function initModalScroll(panelEl, bodyEl) {
  panel = panelEl;
  body = bodyEl;
  if (!panel || !body) return;

  sheetScroll = panel.querySelector('.profile-modal__scroll');

  desktopMq = window.matchMedia(DESKTOP);
  desktopMq.addEventListener('change', onDesktopChange);

  const resizeObs = new ResizeObserver(() => scheduleRefresh());
  resizeObs.observe(body);

  window.addEventListener('resize', scheduleRefresh);
  body.addEventListener('scroll', onScroll, { passive: true });
  panel.addEventListener('wheel', onWheel, { passive: false });

  scheduleRefresh();
  document.fonts?.ready?.then(() => scheduleRefresh());
}

export function isTwoState() {
  return !!panel?.classList.contains('is-two-state');
}

export function resetScroll() {
  cancelGlide();
  if (body) body.scrollTop = 0;
  if (sheetScroll) sheetScroll.scrollTop = 0;
  if (panel) panel.scrollTop = 0;
  syncEdgeClasses(0);
}

/** Clear glide + wheel lock when the modal finishes closing. */
export function clearScrollLocks() {
  cancelGlide();
  clearWheelLock();
}

export function refreshScrollState() {
  if (!panel || !body) return;

  if (!desktopMq.matches) {
    clearDesktopState();
    return;
  }

  cachedScrollHeight = body.scrollHeight;
  cachedClientHeight = body.clientHeight;
  const overflow = cachedScrollHeight - cachedClientHeight;
  const twoState = overflow > 0 && overflow < TWO_STATE_RATIO * cachedClientHeight;

  panel.classList.toggle('is-two-state', twoState);
  if (overflow > 1) {
    syncEdgeClasses(body.scrollTop);
  } else {
    panel.classList.remove('is-can-down', 'is-can-up');
  }
}

/**
 * Handle vertical two-state keys. Returns true if handled.
 * Call from onKey after Esc/arrows, before trapFocus.
 */
export function handleModalScrollKey(event) {
  if (!isTwoState()) return false;

  const key = event.key;
  const target = event.target;
  const interactive =
    target instanceof Element &&
    !!target.closest('button, a, input, textarea, select, [contenteditable]');

  let dir = null;
  if (key === 'ArrowDown' || key === 'PageDown' || key === 'End') {
    dir = 'bottom';
  } else if (key === 'ArrowUp' || key === 'PageUp' || key === 'Home') {
    dir = 'top';
  } else if (key === ' ' || key === 'Spacebar') {
    if (interactive) return false;
    dir = event.shiftKey ? 'top' : 'bottom';
  } else {
    return false;
  }

  event.preventDefault();
  goTo(dir);
  return true;
}

function goTo(dir) {
  const max = Math.max(0, cachedScrollHeight - cachedClientHeight);
  const to = dir === 'top' ? 0 : max;
  const atEnd = dir === 'top' ? body.scrollTop <= EDGE : body.scrollTop >= max - EDGE;
  if (atEnd) return;
  scrollBodyTo(to);
}

function scrollBodyTo(to) {
  if (!body) return;
  cancelGlide();

  if (prefersReducedMotion()) {
    body.scrollTop = to;
    syncEdgeClasses(to);
    return;
  }

  const from = body.scrollTop;
  const dist = to - from;
  if (Math.abs(dist) < 1) {
    syncEdgeClasses(to);
    return;
  }

  const token = ++glideToken;
  const start = performance.now();

  const tick = (now) => {
    if (token !== glideToken) return;
    const t = Math.min(1, (now - start) / GLIDE_MS);
    const eased = 1 - (1 - t) ** 3;
    body.scrollTop = from + dist * eased;
    if (t < 1) {
      glideRaf = requestAnimationFrame(tick);
    } else {
      glideRaf = 0;
      body.scrollTop = to;
      syncEdgeClasses(to);
    }
  };

  glideRaf = requestAnimationFrame(tick);
}

function onWheel(event) {
  if (!isTwoState()) return;

  if (event.ctrlKey) return;
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

  event.preventDefault();

  if (Math.abs(event.deltaY) < DELTA_MIN) return;

  const now = performance.now();
  if (now < wheelLockUntil) return;

  const dir = event.deltaY > 0 ? 'bottom' : 'top';
  const max = Math.max(0, cachedScrollHeight - cachedClientHeight);
  const atEnd = dir === 'top' ? body.scrollTop <= EDGE : body.scrollTop >= max - EDGE;
  if (atEnd) return;

  armWheelLock();
  goTo(dir);
}

function armWheelLock() {
  clearWheelLock();
  wheelLockUntil = performance.now() + WHEEL_LOCK_MS;
  wheelLockTimer = window.setTimeout(() => {
    wheelLockTimer = 0;
    wheelLockUntil = 0;
  }, WHEEL_LOCK_MS);
}

function clearWheelLock() {
  if (wheelLockTimer) {
    window.clearTimeout(wheelLockTimer);
    wheelLockTimer = 0;
  }
  wheelLockUntil = 0;
}

function scheduleRefresh() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      refreshScrollState();
    });
  });
}

function onDesktopChange() {
  cancelGlide();
  clearWheelLock();
  if (!desktopMq.matches) clearDesktopState();
  else scheduleRefresh();
}

function clearDesktopState() {
  panel?.classList.remove('is-two-state', 'is-can-down', 'is-can-up');
  cachedScrollHeight = 0;
  cachedClientHeight = 0;
}

function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    if (!panel || !body || !desktopMq.matches) return;
    if (cachedScrollHeight - cachedClientHeight <= 1) return;
    syncEdgeClasses(body.scrollTop);
  });
}

function syncEdgeClasses(scrollTop) {
  const max = Math.max(0, cachedScrollHeight - cachedClientHeight);
  panel.classList.toggle('is-can-down', scrollTop < max - EDGE);
  panel.classList.toggle('is-can-up', scrollTop > EDGE);
}

function cancelGlide() {
  glideToken += 1;
  if (glideRaf) {
    cancelAnimationFrame(glideRaf);
    glideRaf = 0;
  }
}
