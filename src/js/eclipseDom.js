/** Eclipse overlay DOM builders. */

export function buildOverlay(copy, logoUrl) {
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
  const badge = document.createElement('img');
  badge.className = 'eclipse__logo';
  badge.src = logoUrl;
  badge.alt = '';
  badge.width = 56;
  badge.height = 82;
  badge.decoding = 'async';
  badge.setAttribute('aria-hidden', 'true');
  text.append(title, subtitle, badge);

  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'eclipse__restart';
  restart.textContent = copy.restart;

  root.append(veil, stage, stars, text, restart);
  return root;
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
