import gsap from 'gsap';
import { unlockAbout } from './about.js';
import { getLenis } from './smoothScroll.js';
import { prefersReducedMotion } from './utils.js';

const POSITIONS = [
  [34, 138],
  [96, 62],
  [160, 108],
  [226, 48],
  [288, 120],
];

const SCROLL_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Space',
]);

/** Shared trip between the deck and the constellation. */
const TRAVEL_S = 2.1;
const travelEase = (t) => 1 - (1 - t) ** 3;

let finaleScheduled = false;
let finaleDone = false;
let watchdogId = 0;
let cancelScroll = null;
let travel = null;

export function isFinaleActive() {
  return finaleScheduled || finaleDone;
}

function isChainTravel(owner) {
  return owner === 'chain' || owner === 'chain-return';
}

function stopTravel() {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(lenis.scroll, { immediate: true, force: true });
  else window.scrollTo(0, window.scrollY);
}

export function abortChainTravel() {
  if (!travel || !isChainTravel(travel.owner)) return;
  const current = travel;
  current.interrupt?.();
  stopTravel();
  current.finish(false);
}

export function presentGate(gate) {
  if (prefersReducedMotion()) return Promise.resolve({ mode: 'instant' });
  if (!gate || document.body.classList.contains('is-modal-open')) return Promise.resolve({ mode: 'abort' });
  if (gateVisibleRatio(gate) >= 0.6) return Promise.resolve({ mode: 'ready' });
  const fromY = window.scrollY;
  return scrollToGate(gate, 'chain').then((ok) => {
    if (!ok || document.body.classList.contains('is-modal-open')) return { mode: 'abort' };
    return { mode: 'ready', fromY };
  });
}

/** Scroll back to the Y captured before the chain trip. Cancel leaves the page put. */
export function returnChainScroll(y) {
  if (document.body.classList.contains('is-modal-open')) return Promise.resolve(false);
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const top = Math.min(max, Math.max(0, y));
  return scrollToY(top, 'chain-return', null);
}

/** Wire close → scroll → flash/lines → unlock. */
export function bindFinale({ gate, svg, starIds }) {
  return {
    onClose() {
      if (finaleScheduled || finaleDone) return false;
      finaleScheduled = true;
      armWatchdog(gate, svg);
      window.setTimeout(() => startFinale({ gate, svg, starIds }), 350);
      return true;
    },
  };
}

function armWatchdog(gate, svg) {
  window.clearTimeout(watchdogId);
  watchdogId = window.setTimeout(() => {
    const locked = document.querySelector('#about')?.classList.contains('is-locked');
    if (!locked) return;
    try {
      drawLinesInstant(svg);
    } catch {
      /* ignore */
    }
    safeUnlock(gate);
  }, 10000);
}

function clearWatchdog() {
  window.clearTimeout(watchdogId);
  watchdogId = 0;
}

function safeUnlock(gate) {
  try {
    unlockAbout();
  } catch (error) {
    console.error('constellation unlock failed', error);
  }
  if (gate) gsap.set(gate, { clearProps: 'opacity' });
  finaleDone = true;
  clearWatchdog();
  if (cancelScroll) {
    cancelScroll();
    cancelScroll = null;
  }
}

function startFinale({ gate, svg, starIds }) {
  if (finaleDone || !gate) return;
  if (document.body.classList.contains('is-modal-open')) {
    finaleScheduled = false;
    clearWatchdog();
    return;
  }

  if (prefersReducedMotion()) {
    try {
      drawLinesInstant(svg);
    } catch {
      /* ignore */
    }
    safeUnlock(gate);
    return;
  }

  if (gateVisibleRatio(gate) >= 0.6) {
    playFinale({ gate, svg, starIds });
    return;
  }

  scrollToGate(gate, 'finale').then((arrived) => {
    if (finaleDone) return;
    if (arrived) playFinale({ gate, svg, starIds });
  });
}

function gateVisibleRatio(gate) {
  const rect = gate.getBoundingClientRect();
  if (rect.height <= 0) return 0;
  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, window.innerHeight);
  return Math.max(0, bottom - top) / rect.height;
}

function targetScrollY(gate) {
  const rect = gate.getBoundingClientRect();
  const absTop = rect.top + window.scrollY;
  const y = absTop + rect.height / 2 - window.innerHeight / 2;
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(max, Math.max(0, y));
}

function scrollToGate(gate, owner) {
  return scrollToY(targetScrollY(gate), owner, gate);
}

function scrollToY(y, owner, waitGate) {
  return new Promise((resolve) => {
    let settled = false;
    let interrupted = false;
    const lenis = getLenis();
    let unlisten = null;
    let io = null;
    let raf = 0;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (unlisten) unlisten();
      unlisten = null;
      cancelScroll = null;
      if (io) {
        io.disconnect();
        io = null;
      }
      if (travel && travel.finish === finish) travel = null;
    };

    function finish(ok) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    }

    const onCancel = () => {
      if (settled) return;
      interrupted = true;
      if (unlisten) unlisten();
      unlisten = null;
      cancelScroll = null;
      stopTravel();
      if (waitGate) {
        armWait(waitGate, (observer) => { io = observer; }).then((ok) => finish(ok));
        return;
      }
      finish(false);
    };

    unlisten = bindScrollCancel(onCancel);
    cancelScroll = unlisten;
    travel = {
      owner,
      finish,
      interrupt: () => {
        interrupted = true;
      },
    };

    if (lenis) {
      lenis.scrollTo(y, {
        duration: TRAVEL_S,
        easing: travelEase,
        lerp: null,
        onComplete: () => {
          if (interrupted) return;
          finish(true);
        },
      });
      return;
    }

    const from = window.scrollY;
    const start = performance.now();
    const glide = (now) => {
      if (settled || interrupted) return;
      const t = Math.min(1, (now - start) / (TRAVEL_S * 1000));
      window.scrollTo(0, from + (y - from) * travelEase(t));
      if (t < 1) {
        raf = requestAnimationFrame(glide);
        return;
      }
      window.scrollTo(0, y);
      finish(true);
    };
    raf = requestAnimationFrame(glide);
  });
}

function armWait(gate, takeIo) {
  return new Promise((resolve) => {
    if (gateVisibleRatio(gate) >= 0.5) {
      resolve(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        io.disconnect();
        resolve(true);
      }
    }, { threshold: [0.5] });
    takeIo(io);
    io.observe(gate);
  });
}

function bindScrollCancel(onCancel) {
  const opts = { capture: true, passive: true };
  const onKey = (event) => {
    if (SCROLL_KEYS.has(event.key)) onCancel();
  };
  window.addEventListener('wheel', onCancel, opts);
  window.addEventListener('touchstart', onCancel, opts);
  window.addEventListener('pointerdown', onCancel, opts);
  window.addEventListener('keydown', onKey, opts);
  return () => {
    window.removeEventListener('wheel', onCancel, opts);
    window.removeEventListener('touchstart', onCancel, opts);
    window.removeEventListener('pointerdown', onCancel, opts);
    window.removeEventListener('keydown', onKey, opts);
  };
}

function playFinale({ gate, svg, starIds }) {
  if (finaleDone || !gate || !svg) return;
  finaleDone = true;
  clearWatchdog();
  if (cancelScroll) {
    cancelScroll();
    cancelScroll = null;
  }

  try {
    ensureLines(svg);
    const lines = [...svg.querySelectorAll('[data-lines] path')];
    const hiddenLines = lines.filter((line) => Number.parseFloat(line.getAttribute('stroke-dashoffset')) !== 0);
    const groups = starIds
      .map((id) => svg.querySelector(`[data-id="${CSS.escape(id)}"]`))
      .filter(Boolean);

    hiddenLines.forEach((line) => hideSegment(line));

    const tl = gsap.timeline({
      onComplete: () => safeUnlock(gate),
      onInterrupt: () => safeUnlock(gate),
    });

    groups.forEach((group, i) => {
      const halo = group.querySelector('.constellation__halo--lit');
      const core = group.querySelector('.constellation__core');
      const at = i * 0.14;
      if (!halo || !core) return;
      const wasLit = group.classList.contains('is-lit');
      group.classList.add('is-lit');
      halo.removeAttribute('transform');
      core.removeAttribute('transform');
      // Already-lit: pulse from current opacity. New: rise from 0. Never reset lit to 0.
      if (wasLit) {
        tl.to(halo, {
          keyframes: [
            { opacity: 1, duration: 0.45, ease: 'power2.out' },
            { opacity: 0.9, duration: 0.35, ease: 'power2.inOut' },
          ],
        }, at);
      } else {
        tl.fromTo(halo, { opacity: 0 }, {
          keyframes: [
            { opacity: 1, duration: 0.45, ease: 'power2.out' },
            { opacity: 0.9, duration: 0.35, ease: 'power2.inOut' },
          ],
        }, at);
      }
    });

    const linesAt = groups.length * 0.14 + 0.15;
    hiddenLines.forEach((line, i) => {
      tl.to(line, {
        attr: { 'stroke-dashoffset': 0 },
        duration: 0.9,
        ease: 'power2.inOut',
      }, linesAt + i * 0.9);
    });

    const afterLines = linesAt + hiddenLines.length * 0.9;
    tl.to({}, { duration: 0.8 }, afterLines);
    tl.to(gate, { opacity: 0, duration: 0.5, ease: 'power2.inOut' });
  } catch (error) {
    console.error('constellation finale failed', error);
    try {
      drawLinesInstant(svg);
    } catch {
      /* ignore */
    }
    safeUnlock(gate);
  }
}

export function hideSegment(line) {
  if (!line) return 0;
  line.removeAttribute('pathLength');
  line.style.strokeDasharray = '';
  line.style.strokeDashoffset = '';
  const len = line.getTotalLength();
  const span = len > 0 ? len : 1;
  line.setAttribute('stroke-dasharray', String(span));
  line.setAttribute('stroke-dashoffset', String(span));
  return span;
}

export function showSegment(line) {
  if (!line) return;
  line.setAttribute('stroke-dashoffset', '0');
}

export function ensureLines(svg) {
  const box = svg.querySelector('[data-lines]');
  if (!box || box.childElementCount) return;
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < POSITIONS.length - 1; i += 1) {
    const [x1, y1] = POSITIONS[i];
    const [x2, y2] = POSITIONS[i + 1];
    const line = document.createElementNS(NS, 'path');
    line.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
    line.setAttribute('fill', 'none');
    line.style.stroke = 'color-mix(in srgb, var(--accent) 60%, transparent)';
    line.style.strokeWidth = '1.25';
    line.style.strokeLinecap = 'round';
    box.append(line);
    hideSegment(line);
  }
}

function drawLinesInstant(svg) {
  if (!svg) return;
  ensureLines(svg);
  svg.querySelectorAll('[data-lines] path').forEach((line) => {
    hideSegment(line);
    showSegment(line);
  });
}
