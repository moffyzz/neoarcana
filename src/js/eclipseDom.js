/** Eclipse overlay DOM builders. */

export function buildOverlay(copy) {
  const root = document.createElement('div');
  root.id = 'eclipse';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Фінал');

  const veil = el('div', 'eclipse__veil');
  const stage = el('div', 'eclipse__stage');
  stage.append(el('div', 'eclipse__sun'), el('div', 'eclipse__corona'), el('div', 'eclipse__moon'));

  const stars = document.createElement('canvas');
  stars.className = 'eclipse__stars';
  stars.setAttribute('aria-hidden', 'true');

  const text = el('div', 'eclipse__text');
  const title = el('h2', 'eclipse__title');
  title.setAttribute('aria-label', copy.title);
  title.append(...splitLetters(copy.title));
  const subtitle = el('p', 'eclipse__subtitle', copy.tagline);
  text.append(title, subtitle, buildLogoBadge());

  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'eclipse__restart';
  restart.textContent = copy.restart;

  root.append(veil, stage, stars, text, restart);
  return root;
}

/** Inline moon-card so only the crescent can shift; card outline stays put. */
function buildLogoBadge() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'eclipse__logo logo-mark');
  svg.setAttribute('viewBox', '0 0 52 76');
  svg.setAttribute('aria-hidden', 'true');

  const outline = document.createElementNS(NS, 'path');
  outline.setAttribute('class', 'na-card-outline');
  outline.setAttribute(
    'd',
    'M8 2H44A6 6 0 0 1 50 8V68A6 6 0 0 1 44 74H8A6 6 0 0 1 2 68V8A6 6 0 0 1 8 2Z',
  );
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', 'currentColor');
  outline.setAttribute('stroke-width', '2.4');
  outline.setAttribute('stroke-linejoin', 'round');

  const moon = document.createElementNS(NS, 'path');
  moon.setAttribute('class', 'na-moon');
  moon.setAttribute(
    'd',
    'M40.42 25.23A15 15 0 1 0 40.42 50.77A12.8 12.8 0 1 1 40.42 25.23Z',
  );
  moon.setAttribute('fill', 'currentColor');
  // Nudge crescent left inside the card; outline path is untouched.
  moon.setAttribute('transform', 'translate(-3.5 0)');

  svg.append(outline, moon);
  return svg;
}

function splitLetters(value) {
  const parts = String(value).split(/(\s+)/);
  const nodes = [];
  parts.forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) {
      nodes.push(document.createTextNode(' '));
      return;
    }
    const word = el('span', 'eclipse__word');
    word.setAttribute('aria-hidden', 'true');
    Array.from(part).forEach((char) => {
      const letter = el('span', 'eclipse__letter', char);
      letter.setAttribute('aria-hidden', 'true');
      word.append(letter);
    });
    nodes.push(word);
  });
  return nodes;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
