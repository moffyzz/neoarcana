import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import team from '../data/team.json';
import { assetUrl, initials } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

const LOGO_URL = assetUrl('assets/logo/neo-arcana-moon-card.svg');
const REDUCE = '(prefers-reduced-motion: reduce)';
const MOTION = '(prefers-reduced-motion: no-preference)';

const ICONS = {
  star: '<path d="M12 3.2l2.1 4.4 4.8.7-3.5 3.4.8 4.8L12 14.2l-4.2 2.3.8-4.8-3.5-3.4 4.8-.7z"/>',
  moon: '<path d="M15.2 3.4A7.8 7.8 0 1 0 20.6 14 6.2 6.2 0 0 1 15.2 3.4z"/>',
  sun: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"/>',
  key: '<circle cx="9" cy="10" r="3.2"/><path d="M11.6 11.8L20 20M17.2 17.2v2.6M19.4 19.4H16"/>',
};

export function initSpread() {
  mountCards();
  mountLine();

  const mm = gsap.matchMedia();
  mm.add(REDUCE, () => {
    gsap.set('.flipcard, .flipcard__inner, .spread-line__track, .spread-dot', {
      clearProps: 'transform,opacity',
    });
    gsap.set('.flipcard__inner', { rotateY: 0 });
    gsap.set('.spread-line__track', { scaleX: 1 });
  });
  mm.add(MOTION, () => bindMotion());
}

function mountCards() {
  const host = document.querySelector('#team-spread');
  if (!host) return;
  host.replaceChildren();

  team.team.cards.forEach((card) => {
    host.append(buildFlipcard(card));
  });
}

function buildFlipcard(card) {
  const root = el('article', 'flipcard');
  root.dataset.key = card.key;
  root.setAttribute('aria-label', `${card.index}. ${card.title}`);

  const inner = el('div', 'flipcard__inner');
  const back = el('div', 'flipcard__face flipcard__back');
  back.setAttribute('aria-hidden', 'true');
  back.append(el('span', 'flipcard__back-frame'));

  const logo = el('img', 'flipcard__back-logo');
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');
  logo.src = LOGO_URL;
  logo.width = 72;
  logo.height = 104;
  logo.loading = 'lazy';
  logo.decoding = 'async';
  back.append(logo);

  const front = el('div', 'flipcard__face flipcard__front');
  front.append(el('span', 'flipcard__index', card.index));
  front.append(iconSvg(card.icon));
  front.append(el('h3', 'flipcard__title', card.title));
  front.append(el('p', 'flipcard__text', card.text));

  inner.append(back, front);
  root.append(inner);
  return root;
}

function iconSvg(name) {
  const wrap = el('span', 'flipcard__icon');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.star}</svg>`;
  return wrap;
}

function mountLine() {
  const host = document.querySelector('#team-line');
  if (!host) return;
  host.replaceChildren();

  const track = el('div', 'spread-line__track');
  const dots = el('ul', 'spread-line__dots');
  const members = [...team.members].sort((a, b) => a.order - b.order);

  members.forEach((member) => {
    const item = el('li', 'spread-dot');
    item.dataset.initial = initials(member.name);
    item.title = member.name;
    dots.append(item);
  });

  host.append(track, dots);
}

function bindMotion() {
  const cards = gsap.utils.toArray('.flipcard');
  const inners = cards.map((card) => card.querySelector('.flipcard__inner'));
  const track = document.querySelector('.spread-line__track');
  const dots = gsap.utils.toArray('.spread-dot');
  if (!cards.length) return;

  gsap.set(cards, { opacity: 0, y: 40 });
  gsap.set(inners, { rotateY: 180 });
  gsap.set(track, { scaleX: 0, transformOrigin: 'left center' });
  gsap.set(dots, { opacity: 0, scale: 0.5 });

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power3.out' },
  });

  tl.to(cards, { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 }, 0);
  inners.forEach((inner, i) => {
    const at = 0.45 + i * 0.18;
    tl.to(inner, { rotateY: 90, duration: 0.4, ease: 'power2.in' }, at);
    tl.to(inner, { rotateY: 0, duration: 0.4, ease: 'power2.out' }, at + 0.4);
  });
  tl.to(track, { scaleX: 1, duration: 0.7 }, 0.55);
  tl.to(dots, { opacity: 1, scale: 1, duration: 0.35, stagger: 0.06 }, 0.75);

  ScrollTrigger.create({
    trigger: '#team',
    start: 'top 75%',
    once: true,
    animation: tl,
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
