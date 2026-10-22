import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import team from '../data/team.json';
import {
  onProfileClose,
  onViewedChange,
  viewedCount,
} from './state.js';
import { mountAboutShell } from './aboutMount.js';

gsap.registerPlugin(ScrollTrigger);

const TOTAL = team.members.length;
const REDUCE = '(prefers-reduced-motion: reduce)';
const MOBILE = '(max-width: 639px)';

/** Soft default blur; cursor clears to sharp + accent glow. */
const REVEAL = {
  label: { opacity: 0.48, blur: 2.5, radius: 170 },
  subtitle: { opacity: 0.46, blur: 2, radius: 170 },
  number: { opacity: 0.24, blur: 7, radius: 170 },
  caption: { opacity: 0.4, blur: 2.5, radius: 150 },
  tag: { opacity: 0.44, blur: 3, radius: 150 },
  text: { opacity: 0.55, blur: 1.6, radius: 160 },
};

let section;
let gate;
let shell;
let unlocked = false;
let near = false;
let nodes = [];
let ptrX = 0;
let ptrY = 0;
let ptrInside = false;
let raf = 0;
let mobileMq;
let reduceMq;

export function initAbout() {
  section = document.querySelector('#about');
  if (!section || !team.finale) return;

  gate = section.querySelector('[data-about-gate]');
  shell = section.querySelector('[data-about-shell]');
  if (!shell) return;

  const totalEl = section.querySelector('[data-about-total]');
  if (totalEl) totalEl.textContent = String(TOTAL);
  updateProgress(viewedCount());

  mountAboutShell(shell, team.finale);
  nodes = [...shell.querySelectorAll('[data-reveal]')];
  bindReveal();

  onViewedChange((count) => {
    updateProgress(count);
    if (isReady() && near) unlock();
  });
  onProfileClose(() => {
    if (isReady() && near) unlock();
  });

  ScrollTrigger.create({
    trigger: '#about',
    start: 'top 85%',
    end: 'bottom top',
    onEnter: () => { near = true; if (isReady()) unlock(); },
    onEnterBack: () => { near = true; if (isReady()) unlock(); },
    onLeave: () => { near = false; },
    onLeaveBack: () => { near = false; },
  });
}

function isReady() {
  return viewedCount() >= TOTAL;
}

function updateProgress(count) {
  const el = section?.querySelector('[data-about-viewed]');
  if (el) el.textContent = String(count);
  section?.classList.toggle('is-ready', isReady() && !unlocked);
}

function unlock() {
  if (unlocked) return;
  if (!isReady()) return;
  unlocked = true;

  section.classList.remove('is-locked', 'is-ready');
  section.classList.add('is-unlocked');
  if (gate) gate.hidden = true;
  shell.removeAttribute('inert');
}

function bindReveal() {
  reduceMq = window.matchMedia(REDUCE);
  mobileMq = window.matchMedia(MOBILE);

  if (reduceMq.matches) {
    clearReveal();
    return;
  }

  paintAll(0);
  shell.addEventListener('pointermove', onPointerMove, { passive: true });
  shell.addEventListener('pointerleave', onPointerLeave);
  shell.addEventListener('pointercancel', onPointerLeave);
  reduceMq.addEventListener('change', onMotionChange);
}

function onMotionChange() {
  if (reduceMq.matches) {
    clearReveal();
    return;
  }
  paintAll(ptrInside ? null : 0);
}

function onPointerMove(event) {
  ptrX = event.clientX;
  ptrY = event.clientY;
  ptrInside = true;
  if (!raf) raf = requestAnimationFrame(tick);
}

function onPointerLeave() {
  ptrInside = false;
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  raf = 0;
  if (!ptrInside) {
    paintAll(0);
    return;
  }
  nodes.forEach((node) => {
    const type = node.dataset.reveal;
    const cfg = REVEAL[type] || REVEAL.text;
    const rect = node.getBoundingClientRect();
    const dist = distToRect(ptrX, ptrY, rect);
    const t = softFalloff(dist, cfg.radius);
    applyReveal(node, cfg, t);
  });
}

function paintAll(forcedT) {
  nodes.forEach((node) => {
    const cfg = REVEAL[node.dataset.reveal] || REVEAL.text;
    if (forcedT == null) {
      const rect = node.getBoundingClientRect();
      applyReveal(node, cfg, softFalloff(distToRect(ptrX, ptrY, rect), cfg.radius));
      return;
    }
    applyReveal(node, cfg, forcedT);
  });
}

function applyReveal(node, cfg, t) {
  const lit = Math.pow(t, 0.85);
  const mobileCap = cfg.blur >= 6 ? 4 : 3;
  const baseBlur = mobileMq.matches ? Math.min(cfg.blur, mobileCap) : cfg.blur;
  const opacity = cfg.opacity + (1 - cfg.opacity) * lit;
  const blur = baseBlur * (1 - t);
  node.style.opacity = String(opacity);
  node.style.filter = blur > 0.04 ? `blur(${blur.toFixed(2)}px)` : 'none';

  if (lit <= 0.02) {
    node.style.textShadow = '';
    return;
  }

  const glowNear = (8 * lit).toFixed(1);
  const glowFar = (18 * lit).toFixed(1);
  node.style.textShadow = [
    `0 0 ${glowNear}px color-mix(in srgb, var(--accent) 55%, transparent)`,
    `0 0 ${glowFar}px color-mix(in srgb, var(--accent) 28%, transparent)`,
  ].join(', ');
}

function clearReveal() {
  nodes.forEach((node) => {
    node.style.opacity = '';
    node.style.filter = '';
    node.style.textShadow = '';
  });
}

function distToRect(x, y, rect) {
  const cx = Math.max(rect.left, Math.min(x, rect.right));
  const cy = Math.max(rect.top, Math.min(y, rect.bottom));
  return Math.hypot(x - cx, y - cy);
}

function softFalloff(dist, radius) {
  if (dist >= radius) return 0;
  const u = 1 - dist / radius;
  return u * u * (3 - 2 * u);
}
