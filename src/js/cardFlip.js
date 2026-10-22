import gsap from 'gsap';
import { prefersReducedMotion } from './utils.js';

const FLIP_DUR = 0.7;
const FLIP_EASE = 'power2.inOut';

let flipping = false;

export function isFlipping() {
  return flipping;
}

export function isFaceUp(card) {
  return card?.dataset?.face === 'up';
}

export function setFaceDown(card) {
  if (!card || isFaceUp(card)) return;
  const inner = card.querySelector('.card__inner');
  if (inner) gsap.set(inner, { rotateY: 180 });
  card.dataset.face = 'down';
  card.classList.remove('is-flipping');
  card.setAttribute('aria-label', faceDownLabel(card));
}

/** Instant face-up. No-op when already up. */
export function setFaceUp(card) {
  if (!card || isFaceUp(card)) return;
  const inner = card.querySelector('.card__inner');
  if (inner) gsap.set(inner, { rotateY: 0 });
  card.dataset.face = 'up';
  card.classList.remove('is-flipping');
  card.setAttribute('aria-label', faceUpLabel(card));
}

/**
 * Animate (or snap) to face-up, then onComplete.
 * Raises the card above neighbours for the duration of the flip.
 */
export function flipFaceUp(card, onComplete) {
  if (!card) {
    onComplete?.();
    return;
  }
  if (isFaceUp(card)) {
    onComplete?.();
    return;
  }
  if (flipping) return;

  flipping = true;
  card.classList.add('is-flipping');
  card.classList.remove('is-hot');

  const tilt = card.querySelector('.card__tilt');
  gsap.killTweensOf(tilt);
  if (tilt) gsap.set(tilt, { rotateX: 0, rotateY: 0 });

  const slot = card.closest('.deck__slot');
  const prevCardZ = card.style.zIndex;
  const prevSlotZ = slot ? slot.style.zIndex : '';
  card.style.zIndex = '1000';
  if (slot) slot.style.zIndex = '1000';

  const finish = () => {
    flipping = false;
    card.classList.remove('is-flipping');
    card.style.zIndex = prevCardZ;
    if (slot) slot.style.zIndex = prevSlotZ;
    // Ensure face-up state even if set mid-tween.
    card.dataset.face = 'up';
    const inner = card.querySelector('.card__inner');
    if (inner) gsap.set(inner, { rotateY: 0 });
    card.setAttribute('aria-label', faceUpLabel(card));
    onComplete?.();
  };

  const inner = card.querySelector('.card__inner');
  if (!inner) {
    finish();
    return;
  }

  if (prefersReducedMotion()) {
    finish();
    return;
  }

  gsap.to(inner, {
    rotateY: 0,
    duration: FLIP_DUR,
    ease: FLIP_EASE,
    overwrite: true,
    onComplete: finish,
  });
}

function faceDownLabel(card) {
  const cards = [...document.querySelectorAll('.card[data-id]')];
  const fromDom = cards.indexOf(card) + 1;
  const n = Number(card.dataset.faceIndex) || (fromDom > 0 ? fromDom : 1);
  const total = Number(card.dataset.faceTotal) || Math.max(cards.length, 1);
  return `Закрита карта ${n} з ${total}. Перевернути й відкрити профіль`;
}

function faceUpLabel(card) {
  const name = card.querySelector('.title-name')?.textContent?.trim() || '';
  const arcana = card.querySelector('.card__copy .label')?.textContent?.trim() || '';
  const who = [name, arcana].filter(Boolean).join(', ');
  return who ? `${who}. Відкрити профіль` : 'Відкрити профіль';
}
