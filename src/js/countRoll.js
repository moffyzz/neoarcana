import gsap from 'gsap';

const REDUCE = '(prefers-reduced-motion: reduce)';

/** Rolls the viewed-count digit. Returns a setter. */
export function mountCounter() {
  const host = document.querySelector('[data-deck-viewed]');
  if (!host) return () => {};

  host.classList.add('count-roll');
  host.textContent = '';
  const view = document.createElement('span');
  view.className = 'count-roll__view';
  const strip = document.createElement('span');
  strip.className = 'count-roll__strip';
  const first = document.createElement('span');
  first.textContent = '0';
  strip.append(first);
  view.append(strip);
  host.append(view);

  let value = 0;

  return (next, animate = true) => {
    const reduced = window.matchMedia(REDUCE).matches;
    if (!animate || reduced || next === value) {
      value = next;
      const digit = document.createElement('span');
      digit.textContent = String(next);
      strip.replaceChildren(digit);
      gsap.set(strip, { y: 0 });
      return;
    }

    const incoming = document.createElement('span');
    incoming.textContent = String(next);
    const up = next > value;
    if (up) strip.append(incoming);
    else strip.prepend(incoming);
    value = next;
    gsap.fromTo(strip, { y: up ? 0 : '-1em' }, {
      y: up ? '-1em' : 0,
      duration: 0.45,
      ease: 'power3.out',
      onComplete: () => {
        strip.replaceChildren(incoming);
        gsap.set(strip, { y: 0 });
      },
    });
  };
}
