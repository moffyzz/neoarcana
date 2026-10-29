import gsap from 'gsap';
import team from '../data/team.json';
import { emitProfileClose, markViewed } from './state.js';
import { prefersReducedMotion } from './utils.js';
import { fillProfile } from './modalContent.js';
import { lockScroll, trapFocus, unlockScroll } from './modalFocus.js';
import { createNavigator } from './modalNav.js';
import {
  FLIGHT_DUR,
  flyArt,
  openCardFlight,
  restoreAllCardArt,
  restoreSourceCard,
} from './modalFlip.js';
import { flipFaceUp, isFaceUp, isFlipping, setFaceUp } from './cardFlip.js';
import {
  clearScrollLocks,
  handleModalScrollKey,
  initModalScroll,
  refreshScrollState,
  resetScroll,
} from './modalScroll.js';

const HASH_RE = /^#\/card\/([^/]+)$/;

let members = [];
let index = 0;
let open = false;
let busy = false;
let scrollY = 0;
let returnFocus = null;
let openGate = null;
let closeGate = null;
let root;
let panel;
let art;
let nav;

export function initModal() {
  root = document.querySelector('#profile-modal');
  if (!root) return;
  panel = root.querySelector('.profile-modal__panel');
  art = root.querySelector('[data-profile-art]');
  members = [...team.members].sort((a, b) => a.order - b.order);
  root.querySelector('[data-profile-total]').textContent = String(members.length);

  nav = createNavigator({
    root,
    getMembers: () => members,
    getIndex: () => index,
    setIndex: (value) => { index = value; },
    markAsViewed,
    setBusy: (value) => { busy = value; },
    isBusy: () => busy,
  });

  initModalScroll(panel, root.querySelector('[data-profile-body]'));

  document.querySelectorAll('.card[data-id]').forEach((card) => {
    card.addEventListener('click', () => onCardClick(card));
  });
  root.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', closeFromUi);
  });
  const remember = (dir) => {
    const card = nav.step(dir);
    if (card) returnFocus = card;
  };
  root.querySelector('[data-profile-prev]').addEventListener('click', () => remember(-1));
  root.querySelector('[data-profile-next]').addEventListener('click', () => remember(1));
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  window.addEventListener('popstate', onHash);
  nav.bindPortraitSwipe((dir) => { if (open) remember(dir); });

  const boot = memberFromHash();
  if (boot) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    history.pushState(null, '', `${location.pathname}${location.search}${cardHash(boot.id)}`);
    openById(boot.id, null, { fromHash: true });
  }
}

function cardHash(id) {
  return `#/card/${id}`;
}

function setCardHash(id, mode = 'push') {
  const url = `${location.pathname}${location.search}${cardHash(id)}`;
  if (mode === 'replace') history.replaceState(null, '', url);
  else if (location.hash !== cardHash(id)) history.pushState(null, '', url);
}

function memberFromHash() {
  const match = HASH_RE.exec(location.hash);
  if (!match) return null;
  return members.find((m) => m.id === match[1]) || null;
}

function onHash() {
  if (isFlipping()) return;
  const member = memberFromHash();
  if (member) {
    if (open && members[index]?.id === member.id) return;
    openById(member.id, null, { fromHash: true });
    return;
  }
  if (open || !root.hidden) closeModal({ skipHash: true });
}

function onCardClick(card) {
  if (!card?.dataset?.id) return;
  if (isFaceUp(card)) {
    openById(card.dataset.id, card);
    return;
  }
  // Face-down: flip first, then open. Ignore while flipping or modal busy/open.
  if (isFlipping() || busy || open) return;
  flipFaceUp(card, () => openById(card.dataset.id, card));
}

function openById(id, sourceCard, opts = {}) {
  if (isFlipping()) return;
  const next = members.findIndex((m) => m.id === id);
  if (next < 0 || busy) return;
  if (open && members[index]?.id === id) return;

  if (open) {
    const card = nav.switchTo(next);
    if (card) returnFocus = card;
    return;
  }

  index = next;
  returnFocus = sourceCard || document.querySelector(`.card[data-id="${id}"]`);
  fillProfile(root, members[index]);
  resetScroll();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => refreshScrollState());
  });
  nav.updateChrome();
  markAsViewed(members[index].id);
  if (!opts.fromHash) setCardHash(id, 'push');
  showModal(returnFocus);
}

function showModal(sourceCard) {
  open = true;
  busy = true;
  closeGate?.kill();
  closeGate = null;
  scrollY = lockScroll();
  root.hidden = false;
  root.removeAttribute('inert');
  root.setAttribute('aria-hidden', 'false');

  restoreAllCardArt();

  const reduced = prefersReducedMotion();
  const reveals = root.querySelectorAll('.profile-modal__reveal');
  const backdrop = root.querySelector('.profile-modal__backdrop');
  const body = root.querySelector('[data-profile-body]');
  const navBar = root.querySelector('.profile-modal__nav');
  const closeBtn = root.querySelector('.profile-modal__close');

  const finish = () => {
    openGate = null;
    if (!open) return;
    busy = false;
    closeBtn?.focus();
  };

  // Final panel layout for accurate flight target (opacity only — no mid-flight scale).
  gsap.set(panel, { opacity: 0, scale: 1, x: 0, y: 0, clearProps: 'transform' });
  gsap.set(backdrop, { opacity: 0 });
  gsap.set(art, { opacity: 0 });
  gsap.set(reveals, { opacity: 0, y: 18 });
  gsap.set([body, navBar, closeBtn].filter(Boolean), { opacity: 0, x: -20 });
  void panel.offsetWidth;

  if (reduced) {
    gsap.set([backdrop, panel, reveals, art, body, navBar, closeBtn], {
      opacity: 1, y: 0, scale: 1, x: 0, visibility: 'visible',
    });
    gsap.to([backdrop, panel], { opacity: 1, duration: 0.15 });
    openGate = gsap.delayedCall(0.2, finish);
    return;
  }

  const unfold = () => {
    if (!open) return;
    gsap.to(backdrop, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    gsap.to([body, navBar, closeBtn].filter(Boolean), {
      opacity: 1,
      x: 0,
      duration: 0.4,
      ease: 'power2.out',
    });
    gsap.to(reveals, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
    });
    openGate = gsap.delayedCall(0.45, finish);
  };

  openCardFlight(sourceCard, art, {
    onBeforeHandoff: () => {
      // Left slot visible under the flyer; right column stays hidden until unfold.
      gsap.set(panel, { opacity: 1 });
      gsap.set([body, navBar, closeBtn].filter(Boolean), { opacity: 0, x: -20 });
    },
  }).then((ok) => {
    if (!open) return;
    if (!ok) {
      gsap.set(panel, { opacity: 1 });
      gsap.set(art, { opacity: 1, visibility: 'visible' });
    }
    unfold();
  });
}

function closeFromUi() {
  if (HASH_RE.test(location.hash)) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }
  closeModal({ skipHash: true });
}

function closeModal(opts = {}) {
  if (root.hidden || closeGate) return;

  openGate?.kill();
  openGate = null;
  open = false;
  busy = true;

  const backdrop = root.querySelector('.profile-modal__backdrop');
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  const reduced = prefersReducedMotion();
  const focusEl = returnFocus;
  const sourceArt = focusEl?.querySelector('.card__art');
  const body = root.querySelector('[data-profile-body]');
  const navBar = root.querySelector('.profile-modal__nav');
  const closeBtn = root.querySelector('.profile-modal__close');

  gsap.killTweensOf([panel, art, backdrop]);

  const finishClose = () => {
    closeGate = null;
    clearScrollLocks();
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
    gsap.set([backdrop, panel, art, body, navBar, closeBtn], {
      clearProps: 'opacity,transform,visibility',
    });
    restoreAllCardArt();
    restoreSourceCard(focusEl);
    busy = false;
    unlockScroll(scrollY);
    if (!opts.skipHash && HASH_RE.test(location.hash)) {
      history.replaceState(null, '', `${location.pathname}${location.search}`);
    }
    returnFocus = null;
    focusEl?.focus();
    emitProfileClose();
  };

  if (reduced) {
    restoreAllCardArt();
    restoreSourceCard(focusEl);
    gsap.to([backdrop, panel], { opacity: 0, duration: 0.15 });
    closeGate = gsap.delayedCall(0.2, finishClose);
    return;
  }

  gsap.to([body, navBar, closeBtn].filter(Boolean), {
    opacity: 0,
    x: -12,
    duration: 0.25,
    ease: 'power2.in',
  });
  flyArt(art, sourceArt);
  gsap.to(backdrop, { opacity: 0, duration: 0.35, ease: 'power3.inOut' });
  gsap.to(panel, {
    opacity: 0,
    scale: isDesktop ? 0.96 : 1,
    y: isDesktop ? 0 : 24,
    duration: 0.5,
    ease: 'power3.inOut',
  });
  gsap.to(art, { opacity: 0, duration: 0.25, ease: 'power3.in' });
  closeGate = gsap.delayedCall(FLIGHT_DUR + 0.08, finishClose);
}

function markAsViewed(id) {
  markViewed(id);
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (!card) return;
  card.classList.add('is-viewed');
  const status = card.querySelector('.card__badge--status');
  if (status) status.textContent = 'ПЕРЕГЛЯНУТО';
  // Instant face-up for hash/nav paths (and no-op if already up after a click flip).
  setFaceUp(card);
}

function onKey(event) {
  if (!open && root.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeFromUi();
    return;
  }
  if (!open) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const card = nav.step(event.key === 'ArrowLeft' ? -1 : 1);
    if (card) returnFocus = card;
    return;
  }
  if (handleModalScrollKey(event)) return;
  trapFocus(event, panel);
}
