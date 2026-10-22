import { cssRgb, prefersReducedMotion } from './utils.js';

const MOBILE_MQ = '(max-width: 639px)';
const MAX_PARALLAX = 40;
const MAX_DPR = 2;

function starCount() {
  return window.matchMedia(MOBILE_MQ).matches
    ? 30 + Math.floor(Math.random() * 11)
    : 60 + Math.floor(Math.random() * 31);
}

function makeStars(width, height, count) {
  const text = cssRgb('--text');
  const accent = cssRgb('--accent');
  const stars = [];

  for (let i = 0; i < count; i += 1) {
    const useAccent = i % 3 === 0;
    const color = useAccent ? accent : text;
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 1.1,
      baseAlpha: 0.18 + Math.random() * 0.38,
      twinkle: 0.6 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      color,
    });
  }

  return stars;
}

export function initStars() {
  const canvas = document.querySelector('.starfield');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let frameId = 0;
  let scrollY = window.scrollY;
  let running = false;

  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars(width, height, starCount());
    draw(0, true);
  }

  function parallax() {
    return Math.min(scrollY * 0.04, MAX_PARALLAX);
  }

  function draw(time, freeze) {
    ctx.clearRect(0, 0, width, height);
    const shift = parallax();
    const t = time * 0.001;

    for (const star of stars) {
      const twinkle = freeze
        ? 1
        : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * star.twinkle + star.phase));
      const { r, g, b } = star.color;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.baseAlpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y + shift, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(time) {
    if (!running) return;
    draw(time, false);
    frameId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (running || reducedMq.matches || document.hidden) {
      draw(0, true);
      return;
    }
    running = true;
    frameId = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(frameId);
  }

  function onVisibility() {
    if (document.hidden) {
      stop();
      return;
    }
    start();
  }

  function onScroll() {
    scrollY = window.scrollY;
    if (!running) draw(0, true);
  }

  function onMotionChange() {
    stop();
    start();
  }

  resize();
  start();

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reducedMq.addEventListener('change', onMotionChange);
}
