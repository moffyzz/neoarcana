import { cssRgb } from './utils.js';

const MOBILE_MQ = '(max-width: 639px)';
const MAX_PARALLAX = 40;
const MAX_DPR = 2;
const MAX_METEORS = 2;
const GAP_MIN = 8000;
const GAP_MAX = 20000;
const LIFE_MIN = 800;
const LIFE_MAX = 1600;

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

function makeMeteor(width, height) {
  const text = cssRgb('--text');
  const accent = cssRgb('--accent');
  const goRight = Math.random() > 0.45;
  const startX = goRight
    ? Math.random() * width * 0.55
    : width * 0.45 + Math.random() * width * 0.55;
  const startY = Math.random() * height * 0.35;
  const dist = Math.min(width, height) * (0.35 + Math.random() * 0.35);
  const angle = goRight
    ? Math.PI * 0.18 + Math.random() * 0.22
    : Math.PI - (Math.PI * 0.18 + Math.random() * 0.22);
  const life = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
  return {
    x0: startX,
    y0: startY,
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist,
    len: 48 + Math.random() * 56,
    born: 0,
    life,
    color: Math.random() > 0.55 ? accent : text,
  };
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
  let meteors = [];
  let frameId = 0;
  let scrollY = window.scrollY;
  let running = false;
  let nextMeteorAt = 0;

  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function scheduleNext(now) {
    nextMeteorAt = now + GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars(width, height, starCount());
    meteors = [];
    draw(0, true);
  }

  function parallax() {
    return Math.min(scrollY * 0.04, MAX_PARALLAX);
  }

  function spawnMeteors(now) {
    if (reducedMq.matches || meteors.length >= MAX_METEORS) return;
    if (now < nextMeteorAt) return;
    // Prefer one at a time: only spawn a second rarely while one is live.
    if (meteors.length === 1 && Math.random() > 0.08) {
      scheduleNext(now);
      return;
    }
    const m = makeMeteor(width, height);
    m.born = now;
    meteors.push(m);
    scheduleNext(now + m.life);
  }

  function drawMeteors(now, shift) {
    meteors = meteors.filter((m) => now - m.born < m.life);
    for (const m of meteors) {
      const u = (now - m.born) / m.life;
      const fade = u < 0.15 ? u / 0.15 : u > 0.7 ? (1 - u) / 0.3 : 1;
      const x = m.x0 + m.dx * u;
      const y = m.y0 + m.dy * u + shift;
      const speed = Math.hypot(m.dx, m.dy) || 1;
      const tx = (m.dx / speed) * m.len;
      const ty = (m.dy / speed) * m.len;
      const { r, g, b } = m.color;

      const grad = ctx.createLinearGradient(x - tx, y - ty, x, y);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${0.22 * fade})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${0.85 * fade})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - tx, y - ty);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.95 * fade})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
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

    if (!freeze) {
      spawnMeteors(time);
      drawMeteors(time, shift);
    }
  }

  function loop(time) {
    if (!running) return;
    draw(time, false);
    frameId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (running || reducedMq.matches || document.hidden) {
      meteors = [];
      draw(0, true);
      return;
    }
    running = true;
    scheduleNext(performance.now() + GAP_MIN * 0.5);
    frameId = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(frameId);
    meteors = [];
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
