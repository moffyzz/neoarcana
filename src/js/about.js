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
const UNIT_SEL = '.about__number, .about__tag, .about__para, .about__label, .about__subtitle';
const LOCK_T = 0.85;
const GLOW_MS = 1800;

/** Soft default blur; cursor clears to sharp + accent glow. */
const REVEAL = {
  label: { opacity: 0.48, blur: 2.5, radius: 170 },
  subtitle: { opacity: 0.46, blur: 2, radius: 170 },
  number: { opacity: 0.14, blur: 11, radius: 170 },
  caption: { opacity: 0.28, blur: 4, radius: 150 },
  tag: { opacity: 0.44, blur: 3, radius: 150 },
  text: { opacity: 0.35, blur: 4.5, radius: 160 },
};

let section;
let gate;
let shell;
let unlocked = false;
/** When true, constellation owns unlock; auto paths no-op. */
let unlockClaimed = false;
let near = false;
let nodes = [];
let ptrX = 0;
let ptrY = 0;
let ptrInside = false;
let raf = 0;
let mobileMq;
let reduceMq;
/** @type {Set<Element>} */
let revealedUnits = new Set();
/** @type {WeakMap<Element, number>} */
let glowAt = new WeakMap();

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
    if (!unlockClaimed && isReady() && near) unlock();
  });
  onProfileClose(() => {
    if (!unlockClaimed && isReady() && near) unlock();
  });

  ScrollTrigger.create({
    trigger: '#about',
    start: 'top 85%',
    end: 'bottom top',
    onEnter: () => { near = true; if (!unlockClaimed && isReady()) unlock(); },
    onEnterBack: () => { near = true; if (!unlockClaimed && isReady()) unlock(); },
    onLeave: () => { near = false; },
    onLeaveBack: () => { near = false; },
  });
}

/** Constellation claims unlock ownership; auto paths stay off until unlockAbout(). */
export function claimUnlock() {
  unlockClaimed = true;
}

export function unlockAbout() {
  unlock();
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

  paintFrame();
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
  paintFrame();
}

function onPointerMove(event) {
  ptrX = event.clientX;
  ptrY = event.clientY;
  ptrInside = true;
  startLoop();
}

function onPointerLeave() {
  ptrInside = false;
  startLoop();
}

function startLoop() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  raf = 0;
  const decaying = paintFrame();
  if (ptrInside || decaying) raf = requestAnimationFrame(tick);
}

/** @returns {boolean} true if any revealed glow is still decaying */
function paintFrame() {
  let decaying = false;
  const now = performance.now();

  nodes.forEach((node) => {
    const cfg = REVEAL[node.dataset.reveal] || REVEAL.text;
    const unit = getUnit(node);
    const falloff = ptrInside
      ? softFalloff(distToRect(ptrX, ptrY, node.getBoundingClientRect()), cfg.radius)
      : 0;

    if (falloff >= LOCK_T) lockUnit(unit, now);

    const locked = revealedUnits.has(unit);
    const sharpT = locked ? 1 : falloff;
    const glowT = glowFor(unit, falloff, now, locked);
    if (locked && glowT > 0.02) decaying = true;
    applyReveal(node, cfg, sharpT, glowT);
  });

  return decaying;
}

function getUnit(node) {
  return node.closest(UNIT_SEL) || node;
}

function lockUnit(unit, now) {
  if (revealedUnits.has(unit)) return;
  revealedUnits.add(unit);
  glowAt.set(unit, now);
}

function glowFor(unit, falloffT, now, locked) {
  const near = Math.pow(falloffT, 0.85);
  if (!locked) return near;
  const started = glowAt.get(unit) || now;
  const rest = Math.max(0, 1 - (now - started) / GLOW_MS) * 0.35;
  return Math.max(near, rest);
}

function applyReveal(node, cfg, sharpT, glowT) {
  const lit = Math.pow(sharpT, 0.85);
  const mobileCap = cfg.blur >= 6 ? 4 : 3;
  const baseBlur = mobileMq.matches ? Math.min(cfg.blur, mobileCap) : cfg.blur;
  const opacity = cfg.opacity + (1 - cfg.opacity) * lit;
  const blur = baseBlur * (1 - sharpT);
  node.style.opacity = String(opacity);
  node.style.filter = blur > 0.04 ? `blur(${blur.toFixed(2)}px)` : 'none';

  if (glowT <= 0.02) {
    node.style.textShadow = '';
    return;
  }

  const glowNear = (8 * glowT).toFixed(1);
  const glowFar = (18 * glowT).toFixed(1);
  node.style.textShadow = [
    `0 0 ${glowNear}px color-mix(in srgb, var(--accent) 55%, transparent)`,
    `0 0 ${glowFar}px color-mix(in srgb, var(--accent) 28%, transparent)`,
  ].join(', ');
}

function clearReveal() {
  revealedUnits = new Set();
  glowAt = new WeakMap();
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
