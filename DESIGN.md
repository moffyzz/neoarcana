# DESIGN.md — NEO Arcana

Short design reference. Full spec: CURSOR_PROMPT.md (sections 3, 5, 6). If the two ever disagree, CURSOR_PROMPT.md wins. Follow this file on every edit, however small.

## Mood
Ink-dark night, tarot, quiet and solemn but warm. Dark theme only. Lavender on ink, no gold.

## Colors
Defined once in `src/styles/tokens.css` as CSS variables. Never hardcode a color anywhere else.

| Variable | Value | Use |
|---|---|---|
| `--bg` | #12101A | page background |
| `--surface` | #1D1A29 | panels, modal, card back |
| `--surface-2` | #262236 | raised / hover surface |
| `--border` | #2F2A44 | hairlines |
| `--text` | #EEEAF2 | main text |
| `--text-muted` | #968FA6 | secondary text |
| `--accent` | #B9A7E8 | frames, buttons, links, lines |
| `--accent-hover` | #CDBFF2 | hover state of accent |
| `--on-accent` | #12101A | text on accent buttons |

Personal member color `--card-accent` (from `team.json` → `accent`) is used ONLY for the soft glow around that member's card and small details inside their profile. Never for buttons, links, frames or any UI chrome.

## Typography (self-hosted, Cyrillic + Latin subsets)
- Headings, names, numerals, buttons, small-caps labels: **Philosopher** (700 big titles, 400 labels).
- Body, stories, hints: **Lora** (400/500, italic for quotes).
- Body at least 1rem / 1.7 (profile: 1.0625rem / 1.75). Line length under ~65 characters.
- Small-caps labels: 0.75rem, uppercase, letter-spacing 0.28em, `--accent`.
- Sizes via `clamp()`. Nothing smaller than 14px on a 1920px screen.

## Shape
- Card ratio 2 / 3, card radius 14px, UI radius 10px.
- Card border 1px `--accent` at ~55% opacity.
- Card back (sorochka): `--surface`, thin double `--accent` frame inset 10px, moon-card logo in the center, faint star pattern.

## Motion
- GSAP only (ScrollTrigger, Flip). Animate only `transform` and `opacity`.
- Default ease `power3.out`, durations 0.25–0.9s.
- Everything wrapped in `gsap.matchMedia()`: reduced motion = final states instantly; hover tilt only on `(hover: hover) and (pointer: fine)`; lighter on mobile.
- No heavy effects, no scroll hijacking, no WebGL.

## Layout
- Mobile-first. Breakpoints 640px, 1024px, 1440px.
- Mobile deck = scroll-snap carousel, desktop deck = fan.
- Full-height sections use `100svh`, never `100vh`.
- Tap targets at least 44px. No horizontal page scroll at any width.

## Accessibility
- Contrast AA or better. Visible `:focus-visible` everywhere.
- Real `<button>` / `<a>`. Modal: `role="dialog"`, `aria-modal="true"`, focus trap, Esc closes, arrows switch members.
- Respect `prefers-reduced-motion`.

## Content and language
- UI text in Ukrainian only (`<html lang="uk">`). Code, comments and commits in English.
- All content comes from `src/data/team.json`. Missing image = placeholder, never a broken image.
- Tone of texts: warm, direct, no pathos.

## Never
Light theme, new libraries, localStorage or cookies, backend, analytics, sound, video, custom cursor, features nobody asked for.
