import { initials } from './utils.js';
import { mountSafeImage, portraitImageUrl, cardImageUrl } from './media.js';

export function fillProfile(root, member) {
  root.style.setProperty('--card-accent', member.accent);

  setText(root, '[data-profile-label]', `${member.arcana.uk}, ${member.arcana.number}`);
  setText(root, '[data-profile-name]', member.name);
  setText(root, '[data-profile-power]', member.superpowerShort);
  setText(root, '[data-profile-story]', member.story);
  setText(root, '[data-profile-experience]', member.experience);
  setText(root, '[data-profile-motivation]', member.motivation);
  setText(root, '[data-profile-goals]', member.goals);
  setText(root, '[data-profile-after]', member.afterGraduation);
  setText(root, '[data-profile-superpower]', member.superpower);
  setText(root, '[data-profile-roman]', member.arcana.number);
  setText(root, '[data-profile-initials]', initials(member.name));

  mountPortrait(root, member);
  mountLinks(root, member.links);
}

function setText(root, selector, value) {
  const el = root.querySelector(selector);
  if (el) el.textContent = value ?? '';
}

function mountPortrait(root, member) {
  const img = root.querySelector('[data-profile-img]');
  const ph = root.querySelector('[data-profile-ph]');
  if (!img || !ph) return;

  const primary = portraitImageUrl(member.portraitImage, member.cardImage);
  const cardFallback = cardImageUrl(member.cardImage);
  const urls = [primary, cardFallback].filter(Boolean);

  mountSafeImage(img, ph, urls, {
    alt: member.name,
    loading: 'lazy',
  });
}

function mountLinks(root, links) {
  const box = root.querySelector('[data-profile-links]');
  if (!box) return;
  box.replaceChildren();
  if (!links?.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  links.forEach((link) => {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.label;
    box.append(a);
  });
}
