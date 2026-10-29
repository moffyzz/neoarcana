/** Eclipse overlay star canvas: paint + optional twinkle loop. */

import { cssRgb } from './utils.js';

const MOBILE_MQ = '(max-width: 639px)';
const MAX_DPR = 2;

export function createEclipseStars(canvas) {
  let stars = [];
  let width = 0;
  let height = 0;
  let frameId = 0;
  let running = false;
  let wantTwinkle = false;
  const ctx = canvas?.getContext('2d') || null;

  function layout() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars(width, height);
    draw(0, true);
  }

  function draw(time, freeze) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const t = time * 0.001;
    for (const star of stars) {
      const twinkle = freeze
        ? 1
        : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * star.twinkle + star.phase));
      const { r, g, b } = star.color;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.baseAlpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(time) {
    if (!running) return;
    draw(time, false);
    frameId = window.requestAnimationFrame(loop);
  }

  function start(twinkle) {
    wantTwinkle = !!twinkle;
    stopLoop();
    layout();
    if (!wantTwinkle || document.hidden) {
      draw(0, true);
      return;
    }
    running = true;
    frameId = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function stop() {
    wantTwinkle = false;
    stopLoop();
  }

  function onVisibility() {
    if (document.hidden) {
      stopLoop();
      draw(0, true);
      return;
    }
    if (wantTwinkle && !running) {
      running = true;
      frameId = window.requestAnimationFrame(loop);
    }
  }

  document.addEventListener('visibilitychange', onVisibility);

  return {
    resize() {
      const keep = wantTwinkle;
      layout();
      if (keep && !document.hidden && !running) {
        running = true;
        frameId = window.requestAnimationFrame(loop);
      }
    },
    start,
    stop,
    destroy() {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

function makeStars(width, height) {
  const count = window.matchMedia(MOBILE_MQ).matches ? 45 : 90;
  const text = cssRgb('--text');
  const accent = cssRgb('--accent');
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const color = i % 3 === 0 ? accent : text;
    list.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 1.1,
      baseAlpha: 0.18 + Math.random() * 0.4,
      twinkle: 0.6 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      color,
    });
  }
  return list;
}
