import gsap from 'gsap';
import { isFlipping } from './cardFlip.js';

export function bindPointer(slots, api) {
  const offs = [];
  slots.forEach((slot, index) => {
    const card = slot.querySelector('.card');
    const lift = slot.querySelector('.card__lift');
    const tilt = slot.querySelector('.card__tilt');
    const glow = slot.querySelector('.card__glow');
    const glare = slot.querySelector('.card__glare');
    gsap.set(tilt, { transformPerspective: 1200, force3D: true });

    const onMove = (event) => {
      if (!api.ready() || !card.classList.contains('is-hot')) return;
      if (isFlipping() || card.classList.contains('is-flipping')) return;
      const box = tilt.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width - 0.5;
      const py = (event.clientY - box.top) / box.height - 0.5;
      gsap.to(tilt, {
        rotateX: gsap.utils.clamp(-8, 8, -py * 16),
        rotateY: gsap.utils.clamp(-8, 8, px * 16),
        duration: 0.28,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      if (card.dataset.face !== 'down') {
        glare.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        glare.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
      }
    };

    const onEnter = () => {
      if (!api.ready()) return;
      if (isFlipping() || card.classList.contains('is-flipping')) return;
      card.classList.add('is-hot');
      api.syncIdle();
      slot.style.zIndex = '8';
      gsap.to(lift, { y: -18, scale: 1.04, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(glow, { opacity: 1, duration: 0.45, ease: 'power3.out' });
      // No glare on the card back — keeps the reverse clean.
      gsap.to(glare, {
        opacity: card.dataset.face === 'down' ? 0 : 0.9,
        duration: 0.35,
        ease: 'power3.out',
      });
      nudge(slots, index, true);
    };

    const onLeave = () => {
      card.classList.remove('is-hot');
      api.syncIdle();
      gsap.to(lift, { y: 0, scale: 1, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(tilt, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(glow, { opacity: 0.55, duration: 0.45, ease: 'power3.out' });
      gsap.to(glare, { opacity: 0, duration: 0.35, ease: 'power3.out' });
      slot.style.zIndex = '';
      nudge(slots, index, false);
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);
    card.addEventListener('pointermove', onMove);
    offs.push(() => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      card.removeEventListener('pointermove', onMove);
    });
  });
  return () => offs.forEach((off) => off());
}

export function bindFocus(slots, api) {
  const offs = [];
  slots.forEach((slot) => {
    const card = slot.querySelector('.card');
    const lift = slot.querySelector('.card__lift');
    const onFocus = () => {
      requestAnimationFrame(() => {
        if (!api.ready() || !card.matches(':focus-visible')) return;
        if (isFlipping() || card.classList.contains('is-flipping')) return;
        card.classList.add('is-hot');
        api.syncIdle();
        slot.style.zIndex = '8';
        gsap.to(lift, { y: -18, scale: 1.04, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      });
    };
    const onBlur = () => {
      card.classList.remove('is-hot');
      api.syncIdle();
      gsap.to(lift, { y: 0, scale: 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      slot.style.zIndex = '';
    };
    card.addEventListener('focus', onFocus);
    card.addEventListener('blur', onBlur);
    offs.push(() => {
      card.removeEventListener('focus', onFocus);
      card.removeEventListener('blur', onBlur);
    });
  });
  return () => offs.forEach((off) => off());
}

function nudge(slots, index, active) {
  slots.forEach((slot, i) => {
    if (i === index) return;
    gsap.to(slot.querySelector('.card__lift'), {
      x: active ? (i < index ? -10 : 10) : 0,
      duration: 0.45,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  });
}
