import team from '../data/team.json';
import { assetUrl, initials, prefersReducedMotion } from './utils.js';
import { cardImageUrl, mountSafeImage } from './media.js';
import { setFaceDown } from './cardFlip.js';

function bindText(selector, value) {
  const el = document.querySelector(selector);
  if (el && value) el.textContent = value;
}

function splitHeroTitle(text) {
  const title = document.querySelector('.hero__title');
  if (!title) return;

  const display = text.toUpperCase();
  title.replaceChildren();

  [...display].forEach((char) => {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    if (char === ' ') {
      span.className = 'hero__space';
    } else {
      span.className = 'hero__letter';
      span.textContent = char;
    }
    title.append(span);
  });

  title.setAttribute('aria-label', display);
}

export function renderPage() {
  const { site, team: teamBlock } = team;

  document.title = `${site.title} — ${site.subtitle}`;
  bindText('[data-bind="subtitle"]', site.subtitle.toUpperCase());
  bindText('[data-bind="tagline"]', site.tagline);
  bindText('[data-bind="teamTitle"]', teamBlock.title);
  bindText('[data-bind="teamIntro"]', teamBlock.intro);
  bindText('[data-bind="worldTitle"]', teamBlock.world.title);
  bindText('[data-bind="worldNumber"]', teamBlock.world.number);
  bindText('[data-bind="worldUk"]', teamBlock.world.uk);
  splitHeroTitle(site.title);
  renderDeck(team.members);
}

export function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

const LOGO_URL = assetUrl('assets/logo/neo-arcana-moon-card.svg');
const CARD_BACK_URL = assetUrl('assets/cards/card-back.webp');

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function renderDeck(members) {
  const list = document.querySelector('#deck-list');
  const dots = document.querySelector('#deck-dots');
  const total = document.querySelector('[data-deck-total]');
  if (!list || !dots) return;

  const sorted = [...members].sort((a, b) => a.order - b.order);
  if (total) total.textContent = String(sorted.length);
  list.replaceChildren();
  dots.replaceChildren();

  sorted.forEach((member, index) => {
    const slot = node('li', 'deck__slot');
    slot.append(createCard(member, index === 0, index, sorted.length));
    list.append(slot);

    const dot = node('button', 'deck__dot');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Показати карту ${index + 1}: ${member.name}`);
    dot.addEventListener('click', () => {
      slot.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
    dots.append(dot);
  });

  bindDeckDots(list, dots);
}

function createCard(member, preload, index, total) {
  const card = node('button', 'card');
  card.type = 'button';
  card.dataset.id = member.id;
  card.style.setProperty('--card-accent', member.accent);
  // index/total used via setFaceDown aria after mount into the deck list.
  card.dataset.faceIndex = String(index + 1);
  card.dataset.faceTotal = String(total);

  const float = node('span', 'card__float');
  const lift = node('span', 'card__lift');
  const tilt = node('span', 'card__tilt');
  const inner = node('span', 'card__inner');
  const glow = node('span', 'card__glow');
  const glare = node('span', 'card__glare');
  glow.setAttribute('aria-hidden', 'true');
  glare.setAttribute('aria-hidden', 'true');
  inner.append(createBack(), createFront(member, preload), glare);
  tilt.append(inner);
  lift.append(tilt);
  float.append(glow, lift);
  card.append(float);
  setFaceDown(card);
  return card;
}

function createBack() {
  const face = node('span', 'card__face card__back card__back--art');
  face.setAttribute('aria-hidden', 'true');

  const img = node('img', 'card__back-img');
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.src = CARD_BACK_URL;
  img.width = 1000;
  img.height = 1500;
  img.decoding = 'async';
  img.addEventListener('error', () => restoreLogoBack(face), { once: true });
  face.append(img);
  return face;
}

/** Drop the art modifier and rebuild the classic logo reverse. */
function restoreLogoBack(face) {
  face.classList.remove('card__back--art');
  face.replaceChildren();
  face.append(node('span', 'card__back-frame'));

  const logo = node('img', 'card__back-logo');
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');
  logo.src = LOGO_URL;
  logo.width = 72;
  logo.height = 104;
  logo.loading = 'lazy';
  logo.decoding = 'async';
  face.append(logo);
}

function createFront(member, preload) {
  const face = node('span', 'card__face card__front');
  const art = node('span', 'card__art');

  const img = node('img', 'card__img');
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  /* Intrinsic 2×+ of max fan width (~260 CSS px) for retina object-fit: cover */
  img.width = 1000;
  img.height = 1500;
  img.decoding = 'async';
  img.loading = preload ? 'eager' : 'lazy';
  img.fetchPriority = preload ? 'high' : 'auto';
  img.sizes = '(min-width: 1024px) 260px, 72vw';
  img.hidden = true;

  const placeholder = node('span', 'card__placeholder');
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.append(
    node('span', 'card__roman', member.arcana.number),
    node('span', 'card__initials', initials(member.name)),
  );

  art.append(img, placeholder);
  mountSafeImage(img, placeholder, [cardImageUrl(member.cardImage)], {
    preload,
    loading: preload ? 'eager' : 'lazy',
  });

  const numeral = node('span', 'card__badge card__badge--num', member.arcana.number);
  const status = node('span', 'card__badge card__badge--status', 'ВІДКРИТИ');
  const copy = node('span', 'card__copy');
  copy.append(
    node('span', 'label', member.arcana.uk),
    node('span', 'title-name', member.name),
    node('span', 'card__power', member.superpowerShort),
  );

  face.append(art, node('span', 'card__shade'), numeral, status, copy);
  return face;
}

function bindDeckDots(list, dots) {
  const slots = [...list.children];
  const buttons = [...dots.children];
  const scroller = list.parentElement;
  if (!scroller || !buttons.length) return;

  const setActive = (index) => {
    buttons.forEach((button, i) => {
      const on = i === index;
      button.classList.toggle('is-active', on);
      if (on) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  const onScroll = () => {
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    slots.forEach((slot, i) => {
      const mid = slot.offsetLeft + slot.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setActive(nearest);
  };

  setActive(0);
  scroller.addEventListener('scroll', onScroll, { passive: true });
}
