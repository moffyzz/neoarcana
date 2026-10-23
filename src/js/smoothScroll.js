/** Document smooth wheel scrolling via Lenis (fine pointer, motion OK only). */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initAnchors, settleLocationHash } from './anchors.js';

gsap.registerPlugin(ScrollTrigger);

const FINE = '(hover: hover) and (pointer: fine)';
const REDUCE = '(prefers-reduced-motion: reduce)';

let lenis = null;
let fineMq;
let reduceMq;
let bound = false;

function onTicker(time) {
  lenis?.raf(time * 1000);
}

function refreshScroll() {
  ScrollTrigger.refresh();
  lenis?.resize();
  settleLocationHash();
}

function createLenis() {
  if (lenis) return;

  lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    syncTouch: false,
    duration: 1.1,
    wheelMultiplier: 0.95,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(onTicker);
  gsap.ticker.lagSmoothing(0);
}

function destroyLenis() {
  if (!lenis) return;

  gsap.ticker.remove(onTicker);
  gsap.ticker.lagSmoothing(500, 33);
  lenis.destroy();
  lenis = null;
}

function syncMode() {
  const ok = fineMq.matches && !reduceMq.matches;
  if (ok) createLenis();
  else destroyLenis();
}

export function getLenis() {
  return lenis;
}

export function initSmoothScroll() {
  if (typeof window === 'undefined' || bound) return;

  fineMq = window.matchMedia(FINE);
  reduceMq = window.matchMedia(REDUCE);
  bound = true;

  syncMode();
  fineMq.addEventListener('change', syncMode);
  reduceMq.addEventListener('change', syncMode);

  initAnchors();

  document.fonts.ready.then(refreshScroll);
  window.addEventListener('load', refreshScroll);
}
