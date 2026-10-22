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

let section;
let gate;
let shell;
let unlocked = false;
let near = false;

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
