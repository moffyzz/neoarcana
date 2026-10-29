import '@fontsource/philosopher/cyrillic-400.css';
import '@fontsource/philosopher/latin-400.css';
import '@fontsource/philosopher/cyrillic-700.css';
import '@fontsource/philosopher/latin-700.css';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/deck.css';
import './styles/components.css';
import './styles/about.css';
import './styles/modal.css';
import './styles/motion.css';
import './styles/pointer.css';
import './styles/eclipse.css';
import 'lenis/dist/lenis.css';

import { initHeader, renderPage } from './js/render.js';
import { initSmoothScroll } from './js/smoothScroll.js';
import { initStars } from './js/stars.js';
import { initIntro } from './js/intro.js';
import { initDeck } from './js/deck.js';
import { initModal } from './js/modal.js';
import { initSpread } from './js/spread.js';
import { initAbout } from './js/about.js';
import { initConstellation } from './js/constellation.js';
import { initPointer } from './js/pointer.js';
import { ENABLE_ECLIPSE, initEclipse } from './js/eclipse.js';
import team from './data/team.json';

renderPage();
initSmoothScroll();
initHeader();
initPointer();
initStars();
initIntro();
// Modal before deck so a deep link can mark a card face-up before deal setup.
initModal();
initDeck();
initSpread();
initAbout();
try {
  initConstellation({
    gate: document.querySelector('[data-about-gate]'),
    members: team.members,
  });
} catch (error) {
  console.error('constellation init failed', error);
}
if (ENABLE_ECLIPSE) {
  initEclipse({ site: team.site, finale: team.finale });
}
