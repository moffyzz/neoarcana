/** Site-wide pointer: exact dot + lerped ring/glow, delegated states. */

const REDUCE = '(prefers-reduced-motion: reduce)';
const FINE = '(hover: hover) and (pointer: fine)';
const RING_K = 0.22;
const GLOW_K = 0.12;
const SNAP = 0.1;
const DUST_GAP = 14;
const DUST_N = 8;
const RECT_MS = 120;

let colorCanvas;
let colorCtx;
let accentLum = 0;

let root;
let elDot;
let elRing;
let elGlow;
let elWave;
let dust = [];
let dustI = 0;

let reduceMq;
let fineMq;
let bound = false;

let ptrX = 0;
let ptrY = 0;
let ringX = 0;
let ringY = 0;
let glowX = 0;
let glowY = 0;
let magX = 0;
let magY = 0;

let raf = 0;
let lastT = 0;
let armed = false;
let visible = false;
let needsSnap = true;

let overCard = null;
let overMagnet = null;
let overInput = false;
let overAbout = false;
let magnetRect = null;
let rectAt = 0;
let lastDustX = 0;
let lastDustY = 0;
let pressed = false;
let enterTimer = 0;
let driftX = 0;
let driftY = 0;

export function initPointer() {
  if (typeof window === 'undefined') return;

  reduceMq = window.matchMedia(REDUCE);
  fineMq = window.matchMedia(FINE);
  const accentRaw = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim();
  accentLum = relativeLuminance(cssColorToRgba(accentRaw || '#B9A7E8'));
  mount();
  syncMode();
  reduceMq.addEventListener('change', syncMode);
  fineMq.addEventListener('change', syncMode);
}

function mount() {
  root = document.createElement('div');
  root.className = 'site-pointer';
  root.setAttribute('aria-hidden', 'true');

  elGlow = span('site-pointer__glow');
  elRing = span('site-pointer__ring');
  elRing.append(span('site-pointer__ring-face'));
  elDot = span('site-pointer__dot');
  elWave = span('site-pointer__wave');

  for (let i = 0; i < DUST_N; i += 1) {
    const d = span('site-pointer__dust');
    dust.push(d);
    root.append(d);
  }

  root.append(elGlow, elRing, elDot, elWave);
  document.body.append(root);
}

function span(className) {
  const node = document.createElement('span');
  node.className = className;
  return node;
}

function syncMode() {
  const ok = fineMq.matches && !reduceMq.matches;
  if (ok && !bound) bind();
  if (!ok && bound) unbind();
  if (!ok) {
    document.documentElement.classList.remove('has-site-pointer');
    armed = false;
    hideOrb();
  }
}

function bind() {
  bound = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });
  document.documentElement.addEventListener('mouseenter', onWinEnter);
  document.documentElement.addEventListener('mouseleave', onWinLeave);
  window.addEventListener('blur', onWinLeave);
}

function unbind() {
  bound = false;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointerup', onUp);
  document.removeEventListener('pointerover', onOver);
  document.removeEventListener('pointerout', onOut);
  document.documentElement.removeEventListener('mouseenter', onWinEnter);
  document.documentElement.removeEventListener('mouseleave', onWinLeave);
  window.removeEventListener('blur', onWinLeave);
  stopLoop();
}

function onMove(event) {
  if (!fineMq.matches || reduceMq.matches) return;

  if (!armed) {
    armed = true;
    document.documentElement.classList.add('has-site-pointer');
    needsSnap = true;
  }

  ptrX = event.clientX;
  ptrY = event.clientY;

  if (!visible || needsSnap) showEnter();

  // Refresh after unlock while the pointer is already inside #about.
  if (event.target instanceof Element) {
    setAbout(!!event.target.closest('#about.is-unlocked'));
  }

  spawnDust();
  startLoop();
}

function onDown(event) {
  if (!armed || overInput) return;
  if (event.pointerType === 'touch') return;
  pressed = true;
  root.classList.add('is-pressed');
  ptrX = event.clientX;
  ptrY = event.clientY;
  startLoop();
}

function onUp(event) {
  if (!armed) return;
  pressed = false;
  root.classList.remove('is-pressed');
  if (!overInput) playWave(event.clientX, event.clientY);
}

function onWinEnter() {
  needsSnap = true;
}

function onWinLeave() {
  hideOrb();
  needsSnap = true;
}

function showEnter() {
  if (needsSnap) {
    ringX = ptrX + magX;
    ringY = ptrY + magY;
    glowX = ptrX;
    glowY = ptrY;
    lastDustX = ptrX;
    lastDustY = ptrY;
    paintLayers();
    root.classList.add('is-entering');
    if (enterTimer) window.clearTimeout(enterTimer);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('is-entering');
      });
    });
    enterTimer = window.setTimeout(() => {
      root.classList.remove('is-entering');
      enterTimer = 0;
    }, 280);
    needsSnap = false;
  }
  visible = true;
  root.classList.add('is-visible');
}

function hideOrb() {
  visible = false;
  root.classList.remove('is-visible', 'is-pressed', 'is-entering');
  clearLightStates();
  pressed = false;
  stopLoop();
}

function clearLightStates() {
  root.classList.remove('is-on-light', 'is-morph');
  root.style.removeProperty('--ring-w');
  root.style.removeProperty('--ring-h');
}

function applyMorphSize() {
  if (!magnetRect) return;
  root.style.setProperty('--ring-w', `${magnetRect.width + 8}px`);
  root.style.setProperty('--ring-h', `${magnetRect.height + 8}px`);
}

function syncMorph(el) {
  const can =
    el &&
    el.matches('.btn') &&
    root.classList.contains('is-on-light') &&
    magnetRect &&
    magnetRect.width > 8 &&
    magnetRect.height > 8;
  if (!can) {
    root.classList.remove('is-morph');
    root.style.removeProperty('--ring-w');
    root.style.removeProperty('--ring-h');
    return;
  }
  root.classList.add('is-morph');
  applyMorphSize();
}

function cssColorToRgba(color) {
  if (!colorCanvas) {
    colorCanvas = document.createElement('canvas');
    colorCanvas.width = 1;
    colorCanvas.height = 1;
    colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
  }
  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillStyle = '#000';
  colorCtx.fillStyle = color;
  colorCtx.fillRect(0, 0, 1, 1);
  const d = colorCtx.getImageData(0, 0, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
}

function channelLin(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * channelLin(r) + 0.7152 * channelLin(g) + 0.0722 * channelLin(b);
}

function isLightBackground(el) {
  const { r, g, b, a } = cssColorToRgba(getComputedStyle(el).backgroundColor);
  if (a < 0.5) return false;
  const L = relativeLuminance({ r, g, b });
  const hi = Math.max(accentLum, L);
  const lo = Math.min(accentLum, L);
  return (hi + 0.05) / (lo + 0.05) < 3;
}

function onOver(event) {
  const t = event.target;
  if (!(t instanceof Element)) return;

  if (t.closest('input, textarea, select, [contenteditable]')) {
    setInput(true);
    return;
  }

  const card = t.closest('.card');
  if (card) {
    setCard(card);
  } else {
    const magnet = t.closest('a, button, [role="button"]');
    if (magnet) setMagnet(magnet);
  }

  setAbout(!!t.closest('#about.is-unlocked'));
}

function onOut(event) {
  const t = event.target;
  const related = event.relatedTarget;
  if (!(t instanceof Element)) return;

  if (t.closest('input, textarea, select, [contenteditable]')) {
    if (!(related instanceof Element) || !related.closest('input, textarea, select, [contenteditable]')) {
      setInput(false);
    }
  }

  if (overCard && t.closest('.card') === overCard) {
    if (!(related instanceof Element) || related.closest('.card') !== overCard) {
      clearCard();
    }
  }

  if (overMagnet && t.closest('a, button, [role="button"]') === overMagnet) {
    if (!(related instanceof Element) || related.closest('a, button, [role="button"]') !== overMagnet) {
      clearMagnet();
    }
  }

  if (overAbout && t.closest('#about')) {
    if (!(related instanceof Element) || !related.closest('#about.is-unlocked')) {
      setAbout(false);
    }
  }
}

function setInput(on) {
  overInput = on;
  root.classList.toggle('is-over-input', on);
  if (on) {
    clearCard();
    clearMagnet();
  }
  clearLightStates();
}

function setCard(card) {
  if (overCard === card) return;
  clearMagnet();
  overCard = card;
  root.classList.add('is-card');
  clearLightStates();
  const raw = getComputedStyle(card).getPropertyValue('--card-accent').trim();
  root.style.setProperty('--pointer-accent', raw || 'var(--accent)');
}

function clearCard() {
  if (!overCard) return;
  overCard = null;
  root.classList.remove('is-card');
  root.style.removeProperty('--pointer-accent');
}

function setMagnet(el) {
  if (overMagnet === el) return;
  clearCard();
  overMagnet = el;
  root.classList.add('is-magnetic');
  root.classList.toggle('is-on-light', isLightBackground(el));
  magnetRect = el.getBoundingClientRect();
  rectAt = performance.now();
  syncMorph(el);
  startLoop();
}

function clearMagnet() {
  if (!overMagnet) return;
  const wasMorph = root.classList.contains('is-morph');
  overMagnet = null;
  magnetRect = null;
  magX = 0;
  magY = 0;
  root.classList.remove('is-magnetic');
  clearLightStates();
  if (wasMorph) startLoop();
}

function setAbout(on) {
  if (overAbout === on) return;
  overAbout = on;
  root.classList.toggle('is-about', on);
}

function updateMagnet(now) {
  if (!overMagnet) {
    magX = 0;
    magY = 0;
    return;
  }
  if (!magnetRect || now - rectAt > RECT_MS) {
    magnetRect = overMagnet.getBoundingClientRect();
    rectAt = now;
    if (root.classList.contains('is-morph')) applyMorphSize();
  }
  if (root.classList.contains('is-morph')) {
    magX = 0;
    magY = 0;
    return;
  }
  const cx = magnetRect.left + magnetRect.width * 0.5;
  const cy = magnetRect.top + magnetRect.height * 0.5;
  magX = clamp((cx - ptrX) * 0.2, -6, 6);
  magY = clamp((cy - ptrY) * 0.2, -6, 6);
}

function startLoop() {
  if (raf) return;
  lastT = performance.now();
  raf = requestAnimationFrame(tick);
}

function stopLoop() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
}

function tick(now) {
  raf = 0;
  const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
  lastT = now;

  if (!visible || overInput) return;

  updateMagnet(now);

  const morphing = root.classList.contains('is-morph') && magnetRect;
  const ringTx = morphing
    ? magnetRect.left + magnetRect.width * 0.5
    : ptrX + magX;
  const ringTy = morphing
    ? magnetRect.top + magnetRect.height * 0.5
    : ptrY + magY;

  const rk = 1 - Math.pow(1 - RING_K, dt * 60);
  const gk = 1 - Math.pow(1 - GLOW_K, dt * 60);

  ringX += (ringTx - ringX) * rk;
  ringY += (ringTy - ringY) * rk;
  glowX += (ptrX - glowX) * gk;
  glowY += (ptrY - glowY) * gk;

  paintLayers();

  const busy =
    Math.abs(ringTx - ringX) > SNAP ||
    Math.abs(ringTy - ringY) > SNAP ||
    Math.abs(ptrX - glowX) > SNAP ||
    Math.abs(ptrY - glowY) > SNAP ||
    pressed ||
    !!morphing;

  if (busy) raf = requestAnimationFrame(tick);
}

function paintLayers() {
  elDot.style.transform = `translate3d(${ptrX}px, ${ptrY}px, 0)`;
  elRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
  elGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
}

function spawnDust() {
  if (!visible || overInput || root.classList.contains('is-on-light')) return;
  const dx = ptrX - lastDustX;
  const dy = ptrY - lastDustY;
  if (dx * dx + dy * dy < DUST_GAP * DUST_GAP) return;

  lastDustX = ptrX;
  lastDustY = ptrY;
  driftX = ((dustI * 17) % 11) - 5;
  driftY = -12 - ((dustI * 13) % 9);
  const mote = dust[dustI];
  dustI = (dustI + 1) % DUST_N;
  const x0 = ptrX;
  const y0 = ptrY;
  const x1 = x0 + driftX;
  const y1 = y0 + driftY;
  mote.style.transform = `translate3d(${x0}px, ${y0}px, 0)`;
  mote.animate(
    [
      { opacity: 0.7, transform: `translate3d(${x0}px, ${y0}px, 0)` },
      { opacity: 0, transform: `translate3d(${x1}px, ${y1}px, 0)` },
    ],
    { duration: 500, easing: 'ease-out', fill: 'forwards' },
  );
}

function playWave(x, y) {
  elWave.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
  elWave.animate(
    [
      { opacity: 0.5, transform: `translate3d(${x}px, ${y}px, 0) scale(1)` },
      { opacity: 0, transform: `translate3d(${x}px, ${y}px, 0) scale(2.4)` },
    ],
    { duration: 500, easing: 'ease-out', fill: 'forwards' },
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
