/** Build #about content from team.finale with data-reveal hooks. */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function reveal(node, type) {
  node.dataset.reveal = type;
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
    reveal(el('h3', 'about__label', block.title), 'label'),
    reveal(el('p', 'about__subtitle', block.subtitle), 'subtitle'),
  );

  const list = el('ul', 'about__numbers');
  block.items.forEach((item) => {
    const cell = el('li', 'about__number');
    cell.setAttribute('role', 'group');
    cell.setAttribute('aria-label', `${item.value} ${item.label}`);
    cell.append(
      reveal(el('span', 'about__value', String(item.value)), 'number'),
      reveal(el('span', 'about__caption', item.label), 'caption'),
    );
    list.append(cell);
  });

  group.append(list);
  return group;
}

function buildSkills(block) {
  const group = el('div', 'about__group about__group--skills');
  group.append(reveal(el('h3', 'about__label', block.title), 'label'));

  const list = el('ul', 'about__tags');
  block.tags.forEach((tag) => {
    const item = el('li', 'about__tag');
    item.append(reveal(el('span', 'about__tag-label', tag), 'tag'));
    list.append(item);
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
      block.append(reveal(el('span', 'about__para-label', para.label), 'label'));
    }
    block.append(reveal(el('p', 'about__para-text', para.text), 'text'));
    wrap.append(block);
  });

  group.append(wrap);
  return group;
}
