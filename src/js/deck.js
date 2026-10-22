import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onViewedChange } from './state.js';
import { mountCounter } from './countRoll.js';
import { bindFocus, bindPointer } from './deckPointer.js';

gsap.registerPlugin(ScrollTrigger);

const FINE_POINTER = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const MOTION = '(prefers-reduced-motion: no-preference)';
const REDUCE = '(prefers-reduced-motion: reduce)';

let idleTweens = [];
let deckReady = false;

export function initDeck() {
  const slots = gsap.utils.toArray('.deck__slot');
  if (!slots.length) return;

  const roll = mountCounter();
  const api = { ready: () => deckReady, syncIdle };
  onViewedChange((count) => roll(count));

  const mm = gsap.matchMedia();

  mm.add(REDUCE, () => {
    deckReady = true;
    applyFan(slots);
    gsap.set('.card__inner', { rotateY: 0 });
    gsap.set('.card__float, .card__lift, .card__tilt', { clearProps: 'transform' });
    roll(0, false);
  });

  mm.add(`${MOTION} and (min-width: 1024px)`, () => dealFan(slots));

  mm.add(`${MOTION} and (max-width: 1023px)`, () => dealInPlace(slots));

  mm.add(MOTION, () => startIdle(slots));

  mm.add(FINE_POINTER, () => bindPointer(slots, api));

  mm.add(MOTION, () => bindFocus(slots, api));
}

function fanValue(slot, name) {
  const raw = getComputedStyle(slot).getPropertyValue(name).trim();
  if (!raw) return 0;
  return name === '--fan-rot' ? parseFloat(raw) || 0 : raw;
}

function applyFan(slots) {
  gsap.set(slots, {
    x: 0,
    y: (i, slot) => fanValue(slot, '--fan-y'),
    rotation: (i, slot) => fanValue(slot, '--fan-rot'),
    transformOrigin: 'center bottom',
    force3D: true,
  });
}

function stackOffsets(slots) {
  gsap.set(slots, { x: 0, y: 0, rotation: 0 });
  const deck = document.querySelector('.deck');
  const deckBox = deck.getBoundingClientRect();
  const cx = deckBox.left + deckBox.width / 2;
  const cy = deckBox.top + deckBox.height / 2;
  return slots.map((slot) => {
    const box = slot.getBoundingClientRect();
    return {
      x: cx - (box.left + box.width / 2),
      y: cy - (box.top + box.height / 2),
    };
  });
}

function dealFan(slots) {
  deckReady = false;
  const offsets = stackOffsets(slots);
  const inners = slots.map((slot) => slot.querySelector('.card__inner'));
  gsap.set(slots, {
    x: (i) => offsets[i].x,
    y: (i) => offsets[i].y,
    rotation: 0,
    transformOrigin: 'center bottom',
  });
  gsap.set(inners, { rotateY: 180 });

  const tl = gsap.timeline({
    paused: true,
    defaults: { duration: 0.9, ease: 'power3.out' },
    onComplete: () => {
      deckReady = true;
      syncIdle();
    },
  });

  slots.forEach((slot, i) => {
    const at = i * 0.1;
    tl.to(slot, {
      x: 0,
      y: fanValue(slot, '--fan-y'),
      rotation: fanValue(slot, '--fan-rot'),
    }, at);
    tl.to(inners[i], { rotateY: 90, duration: 0.45, ease: 'power2.in' }, at);
    tl.to(inners[i], { rotateY: 0, duration: 0.45, ease: 'power2.out' }, at + 0.45);
  });

  ScrollTrigger.create({
    trigger: '#deck',
    start: 'top 80%',
    once: true,
    animation: tl,
  });
}

function dealInPlace(slots) {
  deckReady = false;
  const inners = slots.map((slot) => slot.querySelector('.card__inner'));
  const lifts = slots.map((slot) => slot.querySelector('.card__lift'));
  gsap.set(slots, { clearProps: 'transform' });
  gsap.set(inners, { rotateY: 180 });
  gsap.set(lifts, { y: 20 });

  const tl = gsap.timeline({
    paused: true,
    onComplete: () => {
      deckReady = true;
      syncIdle();
    },
  });

  tl.to(lifts, { y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 0);
  tl.to(inners, { rotateY: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 0);

  ScrollTrigger.create({
    trigger: '#deck',
    start: 'top 85%',
    once: true,
    animation: tl,
  });
}

function startIdle(slots) {
  // Per-card timeline: hold (stagger) → ease 0→-4 → yoyo -4↔4.
  // syncIdle pause/resume works on timelines the same as tweens.
  idleTweens = slots.map((slot, i) => {
    const float = slot.querySelector('.card__float');
    const floatDur = 5 + (i / Math.max(slots.length - 1, 1)) * 2;
    const tl = gsap.timeline({ paused: true });
    // Stagger as a gap only — nothing is written to the float until this time.
    tl.to(float, { y: -4, duration: 1.2, ease: 'sine.out' }, i * 0.35);
    tl.to(float, {
      y: 4,
      duration: floatDur,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return tl;
  });
  syncIdle();

  const observer = new MutationObserver(syncIdle);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => {
    observer.disconnect();
    idleTweens.forEach((tween) => tween.kill());
    idleTweens = [];
  };
}

function syncIdle() {
  const paused = !deckReady
    || document.body.classList.contains('is-modal-open')
    || document.querySelector('.card.is-hot');
  idleTweens.forEach((tween) => (paused ? tween.pause() : tween.resume()));
}


