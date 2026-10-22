import gsap from 'gsap';
import { fillProfile } from './modalContent.js';
import { prefersReducedMotion } from './utils.js';

export function createNavigator({ root, getMembers, getIndex, setIndex, markAsViewed, setBusy, isBusy }) {
  function updateChrome() {
    root.querySelector('[data-profile-index]').textContent = String(getIndex() + 1);
  }

  function switchTo(next, dir = next > getIndex() ? 1 : -1) {
    if (isBusy()) return;
    const members = getMembers();
    setBusy(true);
    setIndex(next);
    const member = members[next];
    markAsViewed(member.id);
    updateChrome();

    const url = `${location.pathname}${location.search}#/card/${member.id}`;
    if (location.hash !== `#/card/${member.id}`) history.replaceState(null, '', url);

    const body = root.querySelector('[data-profile-body]');
    const portrait = root.querySelector('[data-profile-portrait]');
    const dx = dir >= 0 ? 24 : -24;

    const apply = () => fillProfile(root, member);

    if (prefersReducedMotion()) {
      apply();
      setBusy(false);
      return document.querySelector(`.card[data-id="${member.id}"]`);
    }

    gsap.timeline({ onComplete: () => setBusy(false) })
      .to([body, portrait], { opacity: 0, x: -dx, duration: 0.2, ease: 'power3.in' }, 0)
      .add(() => {
        apply();
        gsap.set([body, portrait], { x: dx });
      })
      .to(portrait, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, '>')
      .to(body, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, '<');

    return document.querySelector(`.card[data-id="${member.id}"]`);
  }

  function step(dir) {
    const members = getMembers();
    if (isBusy() || members.length < 2) return null;
    const next = (getIndex() + dir + members.length) % members.length;
    return switchTo(next, dir);
  }

  function bindPortraitSwipe(onStep) {
    const portrait = root.querySelector('[data-profile-portrait]');
    if (!portrait) return;
    let x0 = 0;
    let y0 = 0;
    let tracking = false;

    portrait.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      tracking = true;
      x0 = event.touches[0].clientX;
      y0 = event.touches[0].clientY;
    }, { passive: true });

    portrait.addEventListener('touchend', (event) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - x0;
      const dy = touch.clientY - y0;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      onStep(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  return { switchTo, step, updateChrome, bindPortraitSwipe };
}
