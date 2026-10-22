/** Build #about content from team.finale (static, no fog/candle). */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function mountAboutShell(shell, finale) {
  shell.replaceChildren();

  const content = el('div', 'about__content');
  content.append(
    buildNumbers(finale.numbers),
    buildSkills(finale.skills),
    buildTexts(finale.paragraphs),
  );
  shell.append(content);
}

function buildNumbers(block) {
  const group = el('div', 'about__group about__group--numbers');
  group.append(
    el('h3', 'about__label', block.title),
    el('p', 'about__subtitle', block.subtitle),
  );

  const list = el('ul', 'about__numbers');
  block.items.forEach((item) => {
    const cell = el('li', 'about__number');
    cell.setAttribute('role', 'group');
    cell.setAttribute('aria-label', `${item.value} ${item.label}`);
    cell.append(
      el('span', 'about__value', String(item.value)),
      el('span', 'about__caption', item.label),
    );
    list.append(cell);
  });

  group.append(list);
  return group;
}

function buildSkills(block) {
  const group = el('div', 'about__group about__group--skills');
  group.append(el('h3', 'about__label', block.title));

  const list = el('ul', 'about__tags');
  block.tags.forEach((tag) => {
    list.append(el('li', 'about__tag', tag));
  });

  group.append(list);
  return group;
}

function buildTexts(paragraphs) {
  const group = el('div', 'about__group about__group--texts');
  const wrap = el('div', 'about__texts');

  paragraphs.forEach((para) => {
    const isClosing = para.style === 'closing';
    const block = el('div', isClosing ? 'about__para about__para--closing' : 'about__para');
    if (para.label) {
      block.append(el('span', 'about__para-label', para.label));
    }
    block.append(el('p', 'about__para-text', para.text));
    wrap.append(block);
  });

  group.append(wrap);
  return group;
}
