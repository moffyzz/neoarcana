import { assetUrl } from './utils.js';

const cardFiles = import.meta.glob('../../public/assets/cards/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const portraitFiles = import.meta.glob('../../public/assets/portraits/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

function fromGlob(pool, path) {
  const file = String(path || '').split('/').pop();
  if (!file) return '';
  const found = Object.entries(pool).find(([key]) => key.endsWith(`/${file}`));
  return found ? found[1] : '';
}

/** Public-folder URL (works for files Vite serves from /public). */
function publicUrl(path) {
  if (!path) return '';
  return assetUrl(String(path).replace(/^\//, ''));
}

export function cardImageUrl(path) {
  return fromGlob(cardFiles, path) || publicUrl(path);
}

/** Portrait first, then card art, then public-path fallbacks. */
export function portraitImageUrl(portraitPath, cardPath) {
  return (
    fromGlob(portraitFiles, portraitPath)
    || fromGlob(cardFiles, cardPath)
    || fromGlob(cardFiles, portraitPath)
    || publicUrl(portraitPath)
    || publicUrl(cardPath)
  );
}

/**
 * Probe candidate URLs; only reveal <img> after a successful load.
 * On failure keeps the placeholder and never leaves a broken icon.
 */
export function mountSafeImage(img, placeholder, urls, opts = {}) {
  if (!img) return;

  const list = [...new Set((urls || []).filter(Boolean))];
  const alt = opts.alt ?? '';

  img.hidden = true;
  img.removeAttribute('src');
  img.alt = '';
  if (placeholder) placeholder.hidden = false;

  if (!list.length) return;

  let cancelled = false;
  img.dataset.mediaToken = String(Date.now() + Math.random());
  const token = img.dataset.mediaToken;

  const fail = () => {
    if (cancelled || img.dataset.mediaToken !== token) return;
    img.hidden = true;
    img.removeAttribute('src');
    img.alt = '';
    if (placeholder) placeholder.hidden = false;
  };

  const tryAt = (index) => {
    if (cancelled || img.dataset.mediaToken !== token) return;
    if (index >= list.length) {
      fail();
      return;
    }

    const src = list[index];
    const probe = new Image();
    probe.onload = () => {
      if (cancelled || img.dataset.mediaToken !== token) return;
      img.src = src;
      img.alt = alt;
      img.hidden = false;
      if (placeholder) placeholder.hidden = true;
      if (opts.preload) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.append(link);
      }
    };
    probe.onerror = () => tryAt(index + 1);
    probe.src = src;
  };

  img.loading = opts.loading || 'lazy';
  img.decoding = 'async';
  tryAt(0);

  return () => {
    cancelled = true;
  };
}
