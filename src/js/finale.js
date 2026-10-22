import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import team from '../data/team.json';
import {
  onProfileClose,
  onViewedChange,
  viewedCount,
} from './state.js';
import { prefersReducedMotion } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

const TOTAL = team.members.length;
const REDUCE = '(prefers-reduced-motion: reduce)';
const MOTION = '(prefers-reduced-motion: no-preference)';

let root;
let card;
let inner;
let glow;
let burst;
let caption;
let skip;
let unlocked = false;
let breath;
let near = false;

export function initFinale() {
  root = document.querySelector('#world');
  if (!root) return;

  card = root.querySelector('[data-world-card]');
  inner = root.querySelector('.world__inner');
  glow = root.querySelector('.world__glow');
  burst = root.querySelector('.world__burst');
  caption = root.querySelector('.world__caption');
  skip = root.querySelector('[data-world-skip]');

  root.querySelector('[data-finale-total]').textContent = String(TOTAL);
  mountProphecy(team.team.world.prophecy);
  updateProgress(viewedCount());

  gsap.set(inner, { rotateY: 180 });
  gsap.set(burst, { opacity: 0, scale: 0.6 });
  gsap.set('.world__line', { opacity: 0, y: 10 });

  const mm = gsap.matchMedia();
  mm.add(MOTION, () => {
    startBreath();
    return () => stopBreath();
  });
  mm.add(REDUCE, () => {
    stopBreath();
    gsap.set(glow, { clearProps: 'transform,opacity' });
  });

  onViewedChange((count) => {
    updateProgress(count);
    if (isReady() && near) unlock();
  });
  onProfileClose(() => {
    if (isReady() && near) unlock();
  });

  card.addEventListener('click', () => {
    if (unlocked) return;
    if (isReady()) unlock();
  });
  skip.addEventListener('click', () => unlock({ force: true }));

  ScrollTrigger.create({
    trigger: '#finale',
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
  const el = root.querySelector('[data-finale-viewed]');
  if (el) el.textContent = String(count);
  root.classList.toggle('is-ready', isReady() && !unlocked);
}

function mountProphecy(text) {
  const host = root.querySelector('[data-world-prophecy]');
  if (!host) return;
  host.replaceChildren();
  const lines = chunkLines(text);
  lines.forEach((line, i) => {
    const span = document.createElement('span');
    span.className = 'world__line';
    span.textContent = i < lines.length - 1 ? `${line} ` : line;
    host.append(span);
  });
}

function chunkLines(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  for (let i = 0; i < words.length; i += 5) {
    lines.push(words.slice(i, i + 5).join(' '));
  }
  return lines;
}

function startBreath() {
  if (unlocked || breath) return;
  breath = gsap.to(glow, {
    scale: 1.015,
    opacity: 0.55,
    duration: 2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

function stopBreath() {
  breath?.kill();
  breath = null;
}

function unlock(opts = {}) {
  if (unlocked) return;
  if (!opts.force && !isReady()) return;
  unlocked = true;
  stopBreath();

  root.classList.remove('is-locked', 'is-ready');
  root.classList.add('is-unlocked');
  caption.hidden = true;
  skip.hidden = true;
  card.removeAttribute('aria-describedby');
  card.setAttribute('aria-expanded', 'true');
  card.setAttribute('aria-disabled', 'true');
  card.tabIndex = -1;

  if (prefersReducedMotion()) {
    gsap.set(inner, { rotateY: 0 });
    gsap.set(burst, { opacity: 0.35, scale: 1 });
    gsap.set('.world__line', { opacity: 1, y: 0 });
    gsap.set(card, { y: 0 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo(burst, { opacity: 0, scale: 0.55 }, {
    opacity: 0.9,
    scale: 1.15,
    duration: 0.4,
  }, 0);
  tl.to(burst, { opacity: 0.35, scale: 1, duration: 0.4 }, 0.4);
  tl.to(card, { y: -14, duration: 0.45 }, 0.15);
  tl.to(inner, { rotateY: 90, duration: 0.4, ease: 'power2.in' }, 0.35);
  tl.to(inner, { rotateY: 0, duration: 0.4, ease: 'power2.out' }, 0.75);
  tl.to(card, { y: 0, duration: 0.45 }, 0.85);
  tl.to('.world__line', {
    opacity: 1,
    y: 0,
    duration: 0.45,
    stagger: 0.12,
  }, 1.05);
}
