import gsap from 'gsap';

export function initIntro() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero__glow, .hero__letter, .hero__reveal, .logo-mark--hero .na-moon', {
      opacity: 1,
      y: 0,
      scale: 1,
    });
    gsap.set('.logo-mark--hero .na-card-outline', { strokeDashoffset: 0 });
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const moon = document.querySelector('.logo-mark--hero .na-moon');
    if (moon) gsap.set(moon, { transformOrigin: '50% 50%', scale: 0.85 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.to('.hero__glow', { opacity: 1, duration: 0.6 }, 0)
      .to(
        '.logo-mark--hero .na-card-outline',
        { strokeDashoffset: 0, duration: 0.8 },
        0.15,
      )
      .to(
        '.logo-mark--hero .na-moon',
        {
          opacity: 1,
          scale: 1,
          duration: 0.45,
          clearProps: 'transform,transformOrigin',
        },
        0.2,
      )
      .to(
        '.hero__letter',
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.04 },
        0.5,
      )
      .to(
        '.hero__reveal',
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 },
        0.85,
      );

    const hint = gsap.to('.scroll-hint__dot', {
      y: 8,
      duration: 1.15,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
    });

    return () => {
      tl.kill();
      hint.kill();
    };
  });
}
