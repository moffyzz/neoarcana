/** Shared helpers. */

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Convert a `#RRGGBB` token value to an rgb object. */
export function assetUrl(path) {
  const clean = String(path || '').replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}

export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] || '')
    .join('')
    .toLocaleUpperCase('uk');
}

export function cssRgb(name) {
  const hex = cssVar(name).replace('#', '');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}
