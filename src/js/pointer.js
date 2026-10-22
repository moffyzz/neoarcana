/** Site-wide lavender pointer orb (desktop fine pointer only). */

const REDUCE = '(prefers-reduced-motion: reduce)';
const FINE = '(hover: hover) and (pointer: fine)';

let root;
let reduceMq;
let fineMq;
let raf = 0;
let x = 0;
let y = 0;
let active = false;

export function initPointer() {
  if (typeof window === 'undefined') return;

  reduceMq = window.matchMedia(REDUCE);
  fineMq = window.matchMedia(FINE);

  root = document.createElement('div');
  root.className = 'site-pointer';
  root.setAttribute('aria-hidden', 'true');
  root.append(part('site-pointer__glow'), part('site-pointer__ring'));
  document.body.append(root);

  syncMode();
  reduceMq.addEventListener('change', syncMode);
  fineMq.addEventListener('change', syncMode);

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  document.addEventListener('mouseleave', onLeave);
  window.addEventListener('blur', onLeave);
}

function part(className) {
  const node = document.createElement('span');
  node.className = className;
  return node;
}

function syncMode() {
  const enabled = fineMq.matches && !reduceMq.matches;
  document.documentElement.classList.toggle('has-site-pointer', enabled);
  if (!enabled) hide();
}

function onMove(event) {
  if (!fineMq.matches || reduceMq.matches) return;
  x = event.clientX;
  y = event.clientY;
  active = true;
  if (!raf) raf = requestAnimationFrame(tick);
}

function onLeave() {
  active = false;
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  raf = 0;
  if (!active || !fineMq.matches || reduceMq.matches) {
    hide();
    return;
  }
  root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  root.classList.add('is-visible');
}

function hide() {
  root?.classList.remove('is-visible');
}
