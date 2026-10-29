import { claimUnlock } from './about.js';
import {
  abortChainTravel,
  bindFinale,
  ensureLines,
  hideSegment,
  isFinaleActive,
  presentGate,
  returnChainScroll,
  showSegment,
} from './constellationFinale.js';
import { isViewed, onProfileClose, onViewedChange, viewedCount } from './state.js';
import gsap from 'gsap';
import { cssVar, prefersReducedMotion } from './utils.js';

const POSITIONS = [
  [34, 138],
  [96, 62],
  [160, 108],
  [226, 48],
  [288, 120],
];

/** Smaller dots/halos; asterism span (viewBox + positions) unchanged. */
const HALO_R = 11.5;
const CORE_R = 1.65;
const RING_R = 4.75;

/** Gate constellation: viewed stars + close-triggered finale. */
export function initConstellation({ gate, members }) {
  if (!gate || !members?.length) return;

  const host = gate.querySelector('[data-constellation]');
  if (!host) return;

  const sorted = [...members].sort((a, b) => a.order - b.order);
  const starIds = sorted.map((m) => m.id);
  const svg = buildSvg(sorted);
  host.replaceChildren(svg);

  const lit = new Set();
  let chainTl = null;
  let chainGen = 0;

  const syncLabel = () => {
    svg.setAttribute(
      'aria-label',
      `Сузір'я команди: відкрито ${viewedCount()} з ${starIds.length}`,
    );
  };

  const lightStar = (id, { animate = true } = {}) => {
    if (!id || lit.has(id)) return;
    const group = svg.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!group) return;
    lit.add(id);
    group.classList.add('is-lit');
    syncLabel();
    flashGroup(group, { animate });
  };

  const groupFor = (id) => svg.querySelector(`[data-id="${CSS.escape(id)}"]`);

  ensureLines(svg);
  sorted.forEach((member) => {
    if (isViewed(member.id)) lightStar(member.id, { animate: false });
  });
  paintSegments(svg, starIds);
  syncLabel();

  onViewedChange(() => syncLabel());

  const finale = bindFinale({ gate, svg, starIds });

  const cancelChain = () => {
    chainGen += 1;
    if (chainTl) {
      chainTl.kill();
      chainTl = null;
    }
    abortChainTravel();
    if (isFinaleActive()) return;
    gsap.killTweensOf([
      ...svg.querySelectorAll('.constellation__halo--lit, .constellation__core, [data-lines] path'),
    ]);
    snapLit(svg);
    resetPartialLines(svg);
  };

  onProfileClose(() => {
    if (viewedCount() >= starIds.length) {
      cancelChain();
      finale.onClose();
      return;
    }
    cancelChain();
    const steps = buildSteps(svg, starIds, groupFor);
    if (!steps.length) return;
    const gen = chainGen;
    presentGate(gate).then((result) => {
      if (gen !== chainGen || result.mode === 'abort') return;
      // Reduced-motion resolves instantly while modal close may still hold is-modal-open.
      if (result.mode === 'instant') {
        applySteps(svg, starIds, steps, lightStar, false);
        return;
      }
      if (document.body.classList.contains('is-modal-open')) return;
      chainTl = applySteps(svg, starIds, steps, lightStar, true);
      if (!chainTl || result.fromY == null) return;
      const fromY = result.fromY;
      chainTl.to({}, { duration: 1.0 });
      chainTl.call(() => {
        if (gen !== chainGen) return;
        if (document.body.classList.contains('is-modal-open')) return;
        returnChainScroll(fromY);
      });
    });
  });

  claimUnlock();
}

function segmentDrawn(line) {
  return !!line && Number.parseFloat(line.getAttribute('stroke-dashoffset')) === 0;
}

function lineNodes(svg) {
  return [...svg.querySelectorAll('[data-lines] path')];
}

function buildSteps(svg, starIds, groupFor) {
  const lines = lineNodes(svg);
  const shown = new Set();
  const queued = new Set();
  starIds.forEach((id, index) => {
    if (groupFor(id)?.classList.contains('is-lit')) shown.add(index);
  });
  const steps = [];
  const queueLine = (index) => {
    if (queued.has(index) || segmentDrawn(lines[index])) return;
    queued.add(index);
    steps.push({ type: 'line', index });
  };
  for (let i = 0; i < starIds.length; i += 1) {
    const viewed = isViewed(starIds[i]);
    if (viewed && !shown.has(i)) {
      if (i > 0 && isViewed(starIds[i - 1])) queueLine(i - 1);
      steps.push({ type: 'star', index: i });
      shown.add(i);
    }
    if (i > 0 && isViewed(starIds[i - 1]) && viewed) queueLine(i - 1);
  }
  return steps;
}

function paintSegments(svg, starIds) {
  lineNodes(svg).forEach((line, index) => {
    if (isViewed(starIds[index]) && isViewed(starIds[index + 1])) {
      showSegment(line);
    }
  });
}

function resetPartialLines(svg) {
  lineNodes(svg).forEach((line) => {
    if (!segmentDrawn(line)) hideSegment(line);
  });
}

function snapLit(svg) {
  svg.querySelectorAll('.constellation__star.is-lit').forEach((group) => {
    const halo = group.querySelector('.constellation__halo--lit');
    const core = group.querySelector('.constellation__core');
    if (halo) {
      halo.removeAttribute('transform');
      gsap.set(halo, { opacity: 0.9 });
    }
    if (core) core.removeAttribute('transform');
  });
}

function applySteps(svg, starIds, steps, lightStar, animate) {
  const lines = lineNodes(svg);
  if (!animate) {
    steps.forEach((step) => {
      if (step.type === 'line') showSegment(lines[step.index]);
      else lightStar(starIds[step.index], { animate: false });
    });
    return null;
  }
  const tl = gsap.timeline();
  let at = 0;
  steps.forEach((step) => {
    if (step.type === 'line') {
      tl.to(lines[step.index], {
        attr: { 'stroke-dashoffset': 0 },
        duration: 0.9,
        ease: 'power2.inOut',
      }, at);
      at += 0.9;
      return;
    }
    const id = starIds[step.index];
    tl.call(() => lightStar(id, { animate: true }), null, at);
    at += 0.8;
  });
  return tl;
}

function flashGroup(group, { animate = true } = {}) {
  const halo = group.querySelector('.constellation__halo--lit');
  const core = group.querySelector('.constellation__core');
  const ring = group.querySelector('.constellation__ring');
  if (!halo || !core) return;

  halo.removeAttribute('transform');
  core.removeAttribute('transform');

  if (!animate || prefersReducedMotion()) {
    gsap.set(halo, { opacity: 0.9 });
    if (ring) ring.classList.remove('is-waving');
    return;
  }

  // Soft lavender flash: opacity on lit halo only (bob twinkle stays separate).
  gsap.killTweensOf(halo);
  gsap.set(halo, { opacity: 0 });
  gsap.timeline().to(halo, {
    keyframes: [
      { opacity: 1, duration: 0.45, ease: 'power2.out' },
      { opacity: 0.9, duration: 0.35, ease: 'power2.inOut' },
    ],
  });

  // Retrigger one expanding ring wave each time this star lights.
  if (ring) {
    ring.classList.remove('is-waving');
    // Force reflow so the CSS animation can restart.
    void ring.getBoundingClientRect();
    ring.classList.add('is-waving');
  }
}

function buildSvg(members) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 320 190');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Сузір'я команди: відкрито 0 з ${members.length}`);
  svg.classList.add('constellation');

  const defs = document.createElementNS(NS, 'defs');
  const lines = document.createElementNS(NS, 'g');
  lines.setAttribute('data-lines', '');

  const accent = cssVar('--accent') || '#B9A7E8';

  const dimGrad = document.createElementNS(NS, 'radialGradient');
  dimGrad.setAttribute('id', 'constellation-halo-dim');
  dimGrad.setAttribute('cx', '50%');
  dimGrad.setAttribute('cy', '50%');
  dimGrad.setAttribute('r', '50%');
  const dim0 = document.createElementNS(NS, 'stop');
  dim0.setAttribute('offset', '0%');
  dim0.setAttribute('stop-color', accent);
  dim0.setAttribute('stop-opacity', '0.45');
  const dim1 = document.createElementNS(NS, 'stop');
  dim1.setAttribute('offset', '55%');
  dim1.setAttribute('stop-color', accent);
  dim1.setAttribute('stop-opacity', '0.18');
  const dim2 = document.createElementNS(NS, 'stop');
  dim2.setAttribute('offset', '100%');
  dim2.setAttribute('stop-color', accent);
  dim2.setAttribute('stop-opacity', '0');
  dimGrad.append(dim0, dim1, dim2);
  defs.append(dimGrad);

  const litGrad = document.createElementNS(NS, 'radialGradient');
  litGrad.setAttribute('id', 'constellation-halo-lit');
  litGrad.setAttribute('cx', '50%');
  litGrad.setAttribute('cy', '50%');
  litGrad.setAttribute('r', '50%');
  const lit0 = document.createElementNS(NS, 'stop');
  lit0.setAttribute('offset', '0%');
  lit0.setAttribute('stop-color', accent);
  lit0.setAttribute('stop-opacity', '0.9');
  const lit1 = document.createElementNS(NS, 'stop');
  lit1.setAttribute('offset', '50%');
  lit1.setAttribute('stop-color', accent);
  lit1.setAttribute('stop-opacity', '0.42');
  const lit2 = document.createElementNS(NS, 'stop');
  lit2.setAttribute('offset', '100%');
  lit2.setAttribute('stop-color', accent);
  lit2.setAttribute('stop-opacity', '0');
  litGrad.append(lit0, lit1, lit2);
  defs.append(litGrad);

  members.forEach((member, index) => {
    const [cx, cy] = POSITIONS[index] || POSITIONS[0];

    const group = document.createElementNS(NS, 'g');
    group.setAttribute('data-id', member.id);
    group.classList.add('constellation__star');

    const bob = document.createElementNS(NS, 'g');
    bob.classList.add('constellation__bob');

    const haloDim = document.createElementNS(NS, 'circle');
    haloDim.classList.add('constellation__halo', 'constellation__halo--dim');
    haloDim.setAttribute('cx', String(cx));
    haloDim.setAttribute('cy', String(cy));
    haloDim.setAttribute('r', String(HALO_R));
    haloDim.setAttribute('fill', 'url(#constellation-halo-dim)');

    const haloLit = document.createElementNS(NS, 'circle');
    haloLit.classList.add('constellation__halo', 'constellation__halo--lit');
    haloLit.setAttribute('cx', String(cx));
    haloLit.setAttribute('cy', String(cy));
    haloLit.setAttribute('r', String(HALO_R));
    haloLit.setAttribute('fill', 'url(#constellation-halo-lit)');

    const ring = document.createElementNS(NS, 'circle');
    ring.classList.add('constellation__ring');
    ring.setAttribute('cx', String(cx));
    ring.setAttribute('cy', String(cy));
    ring.setAttribute('r', String(RING_R));
    ring.setAttribute('fill', 'none');

    const core = document.createElementNS(NS, 'circle');
    core.classList.add('constellation__core');
    core.setAttribute('cx', String(cx));
    core.setAttribute('cy', String(cy));
    core.setAttribute('r', String(CORE_R));

    bob.append(haloDim, haloLit, ring, core);
    group.append(bob);
    svg.append(group);
  });

  svg.prepend(defs, lines);
  return svg;
}
