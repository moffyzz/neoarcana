import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

export const FLIGHT_DUR = 0.5;
const FLIGHT_EASE = 'power2.inOut';
const HANDOFF_LEAD = 0.12;
const HANDOFF_FADE = 0.15;

/** Open: flight → 3D flip → handoff into targetArt. */
export function openCardFlight(sourceCard, targetArt, opts = {}) {
  const sourceArt = sourceCard?.querySelector('.card__art');
  if (!sourceArt || !targetArt) return Promise.resolve(false);

  settleSource(sourceCard);

  const from = sourceArt.getBoundingClientRect();
  if (from.width < 8 || from.bottom < 0 || from.top > window.innerHeight) {
    return Promise.resolve(false);
  }

  const to = targetArt.getBoundingClientRect();
  if (to.width < 8) return Promise.resolve(false);

  sourceCard.style.zIndex = '1000';

  const flyer = buildFlyer(sourceArt, from, targetArt);
  document.body.append(flyer);
  const spin = flyer.querySelector('.profile-modal__flyer-spin');

  gsap.set(sourceArt, { opacity: 0 });
  gsap.set(targetArt, { opacity: 0, visibility: 'hidden' });

  const state = Flip.getState(flyer);
  gsap.set(flyer, {
    left: to.left,
    top: to.top,
    width: to.width,
    height: to.height,
  });

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        opts.onBeforeHandoff?.();
        gsap.set(targetArt, { visibility: 'visible', opacity: 1 });
        gsap.set(spin, { rotateY: 0 });
        flyer.remove();
        resolve(true);
      },
    });

    tl.add(
      Flip.from(state, {
        duration: FLIGHT_DUR,
        ease: FLIGHT_EASE,
        absolute: true,
      }),
      0,
    );

    tl.to(
      spin,
      {
        keyframes: [
          { rotateY: 180, duration: FLIGHT_DUR / 2, ease: 'power2.in' },
          { rotateY: 360, duration: FLIGHT_DUR / 2, ease: 'power2.out' },
        ],
        transformPerspective: 1400,
      },
      0,
    );
  });
}

/** Close return: land on true rotated card geometry, then crossfade. */
export function flyArt(sourceArt, targetArt) {
  if (!sourceArt || !targetArt) return false;

  const from = sourceArt.getBoundingClientRect();
  if (from.width < 8 || from.bottom < 0 || from.top > window.innerHeight) return false;

  try {
    const land = measureTrueLanding(targetArt);
    if (!land) return false;

    const flyer = buildFlyer(sourceArt, from, targetArt, { matchDeckCard: true });
    document.body.append(flyer);

    gsap.set(flyer, { rotation: 0, transformOrigin: '50% 50%', opacity: 1 });
    const state = Flip.getState(flyer);
    gsap.set(flyer, {
      left: land.cx - land.trueW / 2,
      top: land.cy - land.trueH / 2,
      width: land.trueW,
      height: land.trueH,
    });

    // Flip handles box only (simple) — rotation is tweened in parallel.
    Flip.from(state, {
      duration: FLIGHT_DUR,
      ease: FLIGHT_EASE,
      absolute: true,
      simple: true,
    });

    gsap.fromTo(
      flyer,
      { rotation: 0 },
      {
        rotation: land.thetaDeg,
        duration: FLIGHT_DUR,
        ease: FLIGHT_EASE,
      },
    );

    // Crossfade: real art stays hidden until handoff lead-in.
    gsap.delayedCall(Math.max(0, FLIGHT_DUR - HANDOFF_LEAD), () => {
      gsap.set(targetArt, { clearProps: 'opacity' });
      gsap.to(flyer, {
        opacity: 0,
        duration: HANDOFF_FADE,
        ease: 'none',
        onComplete: () => flyer.remove(),
      });
    });

    return true;
  } catch {
    return false;
  }
}

/** True unrotated size + center + cumulative rotation of a (possibly fan-rotated) el. */
function measureTrueLanding(el) {
  const bbox = el.getBoundingClientRect();
  if (bbox.width < 8) return null;

  let theta = 0;
  let node = el;
  while (node && node !== document.body) {
    const t = getComputedStyle(node).transform;
    if (t && t !== 'none') {
      try {
        const m = new DOMMatrix(t);
        theta += Math.atan2(m.b, m.a);
      } catch {
        /* ignore invalid matrices */
      }
    }
    node = node.parentElement;
  }

  const ow = el.offsetWidth || bbox.width;
  const oh = el.offsetHeight || bbox.height;
  const cos = Math.abs(Math.cos(theta));
  const sin = Math.abs(Math.sin(theta));
  const denom = ow * cos + oh * sin;
  const s = denom > 0 ? bbox.width / denom : 1;

  return {
    thetaDeg: (theta * 180) / Math.PI,
    trueW: ow * s,
    trueH: oh * s,
    cx: bbox.left + bbox.width / 2,
    cy: bbox.top + bbox.height / 2,
  };
}

export function restoreSourceCard(card) {
  if (!card) return;
  card.style.zIndex = '';
  const art = card.querySelector('.card__art');
  if (art) gsap.set(art, { clearProps: 'opacity' });
}

function settleSource(card) {
  card.classList.remove('is-hot');
  const lift = card.querySelector('.card__lift');
  const tilt = card.querySelector('.card__tilt');
  gsap.killTweensOf([lift, tilt]);
  gsap.set(lift, { y: 0, scale: 1, x: 0 });
  gsap.set(tilt, { rotateX: 0, rotateY: 0 });
}

function buildFlyer(sourceArt, from, targetArt, opts = {}) {
  const flyer = document.createElement('div');
  flyer.className = 'profile-modal__flyer';
  flyer.setAttribute('aria-hidden', 'true');

  // Deck close: clip with .card__face radius (art itself has none).
  const cardFace = opts.matchDeckCard
    ? targetArt.closest?.('.card')?.querySelector('.card__face')
    : null;
  const radius = getComputedStyle(cardFace || targetArt).borderRadius
    || getComputedStyle(sourceArt).borderRadius
    || '0px';

  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '1000',
    pointerEvents: 'none',
    perspective: '1400px',
    borderRadius: radius,
    overflow: opts.matchDeckCard ? 'hidden' : 'visible',
    opacity: '1',
    visibility: 'visible',
    transform: 'none',
    transition: 'none',
  });

  const spin = document.createElement('div');
  spin.className = 'profile-modal__flyer-spin';
  Object.assign(spin.style, {
    width: '100%',
    height: '100%',
    position: 'relative',
    transformStyle: 'preserve-3d',
    borderRadius: radius,
    overflow: 'hidden',
  });

  const face = sourceArt.cloneNode(true);
  Object.assign(face.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    margin: '0',
    borderRadius: radius,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    transform: 'none',
  });

  if (opts.matchDeckCard) {
    face.querySelectorAll('img').forEach((img) => {
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center';
    });
  }

  const back = document.createElement('div');
  back.className = 'profile-modal__flyer-back';
  Object.assign(back.style, {
    position: 'absolute',
    inset: '0',
    borderRadius: radius,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
  });

  spin.append(face, back);
  flyer.append(spin);
  return flyer;
}
