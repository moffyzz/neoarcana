/** Eclipse GSAP timelines (full + reduced-motion). */

import gsap from 'gsap';

const SUN_IN = 1.2;
const MOON_SLIDE = 3.2;
const TOTALITY = 1.2;
const MOON_GROW = 2.4;
const LETTER_STAGGER = 0.07;
const SUB_IN = 0.6;
const LOGO_IN = 0.6;
const RESTART_AT = 12;
const RESTART_IN = 0.8;
const REDUCE_FADE = 0.8;

export function buildTimeline(els, pageBits, onDone) {
  const cover = moonCoverScale(els.moon);
  const tl = gsap.timeline({ defaults: { ease: 'none' }, onComplete: onDone });

  gsap.set(els.moon, { willChange: 'transform' });

  tl.to(pageBits, { opacity: 0.35, duration: SUN_IN, ease: 'power2.out' }, 0);
  tl.fromTo(
    els.sun,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: SUN_IN, ease: 'power2.out' },
    0,
  );

  tl.fromTo(
    els.moon,
    { x: '-120vw', scale: 1 },
    { x: 0, scale: 1, duration: MOON_SLIDE, ease: 'power1.inOut' },
    SUN_IN,
  );
  tl.to(els.veil, { opacity: 0.75, duration: MOON_SLIDE, ease: 'power1.inOut' }, SUN_IN);

  const totAt = SUN_IN + MOON_SLIDE;
  tl.fromTo(
    els.corona,
    { opacity: 0, scale: 1 },
    {
      keyframes: [
        { opacity: 0.9, scale: 1, duration: TOTALITY * 0.35, ease: 'power2.out' },
        { opacity: 0.35, scale: 1.12, duration: TOTALITY * 0.65, ease: 'power1.inOut' },
      ],
    },
    totAt,
  );
  tl.to(els.sun, { opacity: 0, duration: TOTALITY, ease: 'power2.inOut' }, totAt);
  tl.to(els.stars, { opacity: 1, duration: 1.2, ease: 'power2.out' }, totAt);

  const growAt = totAt + TOTALITY;
  tl.to(els.moon, { scale: cover, duration: MOON_GROW, ease: 'power1.inOut' }, growAt);
  tl.to(els.corona, { opacity: 0, duration: MOON_GROW * 0.5, ease: 'power2.in' }, growAt);
  tl.to(els.veil, { opacity: 1, duration: MOON_GROW, ease: 'power1.inOut' }, growAt);

  const textAt = growAt + MOON_GROW;
  tl.to(
    els.letters,
    {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      duration: 0.55,
      stagger: LETTER_STAGGER,
      ease: 'power2.out',
    },
    textAt,
  );

  const subAt = textAt + Math.max(0, els.letters.length - 1) * LETTER_STAGGER + 0.35;
  tl.fromTo(
    els.subtitle,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: SUB_IN, ease: 'power2.out' },
    subAt,
  );
  tl.to(els.badge, { opacity: 0.95, duration: LOGO_IN, ease: 'power2.out' }, subAt + 0.35);
  tl.to(els.restart, { opacity: 1, duration: RESTART_IN, ease: 'power2.out' }, RESTART_AT);

  return tl;
}

export function buildReducedTimeline(els, pageBits, onDone) {
  const tl = gsap.timeline({ onComplete: onDone });
  gsap.set(els.sun, { opacity: 0, scale: 1 });
  gsap.set(els.corona, { opacity: 0, scale: 1 });
  gsap.set(els.moon, { opacity: 0, x: 0, scale: 1, clearProps: 'willChange' });
  gsap.set(els.stars, { opacity: 1 });
  gsap.set(els.letters, { opacity: 0, y: 0, filter: 'blur(0px)' });
  gsap.set(els.subtitle, { opacity: 0, y: 0 });
  gsap.set(els.badge, { opacity: 0.95 });
  gsap.set(els.restart, { opacity: 1 });

  tl.to(pageBits, { opacity: 0.35, duration: REDUCE_FADE, ease: 'power2.out' }, 0);
  tl.to(els.veil, { opacity: 1, duration: REDUCE_FADE, ease: 'power2.out' }, 0);
  tl.to(
    [...els.letters, els.subtitle],
    { opacity: 1, duration: REDUCE_FADE, ease: 'power2.out' },
    0,
  );
  return tl;
}

export function resetVisuals(els) {
  gsap.set(els.veil, { opacity: 0 });
  gsap.set(els.sun, { opacity: 0, scale: 0.9 });
  gsap.set(els.corona, { opacity: 0, scale: 1 });
  gsap.set(els.moon, { opacity: 1, x: '-120vw', scale: 1, clearProps: 'willChange' });
  gsap.set(els.stars, { opacity: 0 });
  gsap.set(els.letters, { opacity: 0, y: 14, filter: 'blur(12px)' });
  gsap.set(els.subtitle, { opacity: 0, y: 12 });
  gsap.set(els.badge, { opacity: 0 });
  gsap.set(els.restart, { opacity: 0 });
}

function moonCoverScale(moon) {
  const size = moon.getBoundingClientRect().width || 1;
  return (Math.hypot(window.innerWidth, window.innerHeight) * 1.25) / size;
}
