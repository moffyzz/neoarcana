# NEO Arcana — Addendum (v2): "Candle reveal" finale block

This is an **addition** to `CURSOR_PROMPT.md`. Everything in that file still applies (stack, tokens, fonts, structure, a11y, performance, no localStorage). Where this addendum conflicts with section 5.5 or the footer description of the main file, **this addendum wins**. `src/data/team.json` has a top-level key `finale` (already provided).

v2 change summary: the group labels and the numbers subtitle are now **blurred and dimmed** too (they used to stay readable). The only always-sharp element is the hint line. Auto-reveal order was made explicit so every heading appears just before its content.

## 1. What we are adding

A new section **`#about`** placed in the page **after the World card (`#finale`) and before the footer**. It contains a hint line plus three stacked groups, all using the same "candle reveal" effect:

1. **Команда в цифрах** — four big numbers with captions.
2. **Що ми вміємо разом** — a cloud of skill tags.
3. **Text paragraphs** — three titled paragraphs («Чому таро», «Як ми це зробили», «Що далі») and one closing italic line («Дякуємо Neoversity…»).

Add a header link «Про нас» → `#about` next to «Колода» and «Команда».

The section is independent from the World-card lock: it is always present and does not wait for the five profiles to be opened.

## 2. Data (`team.json` → `finale`)

```
finale.numbers   { title, subtitle, items: [{ value:int, label:string }] }   // exactly 4 items
finale.skills    { title, tags: string[] }                                   // 6–10 tags
finale.paragraphs[] { key, label, style: "main" | "closing", text }          // 4 items; "closing" has empty label
```

Render everything from this data. Fields starting with `_todo` are notes for humans; ignore them in code. Numbers are integers (count-up targets).

## 3. Layout

Container: max-width 880px, centered, vertical padding `clamp(72px, 12vh, 140px)`, subtle radial lavender glow behind it (`radial-gradient`, `--accent` at 10–14%), thin lavender gradient dividers (1px, `--accent` at 45%, width 60%, fading to transparent at the sides) between the three groups.

0. **Hint line** at the very top of the section, centered, italic Lora, `0.9rem`, `--text-muted`: `Проведи курсором — і прочитаєш усе`. It is the **only sharp element** in the sleeping state (see 4.3) so the section never looks empty. Breathing opacity 0.45 ↔ 1 over 3.4 s.
1. **Numbers group**
   - Small caps label `КОМАНДА В ЦИФРАХ` (`--accent`, Philosopher, `0.75rem`, tracking `0.28em`) + italic Lora subtitle in `--text-muted`.
   - A 4-column row. Each cell: number in Philosopher 700, `clamp(2.4rem, 6vw, 4rem)`, `--text`; caption in Lora `0.85rem`, `--text-muted`. 1px `--border` vertical dividers between cells (none before the first). Mobile (< 640px): 2×2 grid, dividers removed.
2. **Skills group**
   - Small caps label `ЩО МИ ВМІЄМО РАЗОМ`.
   - Tags centered, wrapping, gap `10px 12px`, max-width 560px. Tag: Lora `0.85rem`, `--text`, background `--surface`, 1px border `--accent` at 55% opacity, `border-radius: 999px`, padding `6px 16px`.
3. **Text group**
   - Max-width 560px, centered text. Each `main` paragraph: small caps label (`--accent`) above, then Lora `1rem / 1.8`, `--text`. Spacing between paragraphs `28px`.
   - The `closing` paragraph: Lora italic, `0.9rem`, `--text-muted`, no label, extra top margin.

## 4. The effect: "candle reveal"

Concept: the block is **dim and misty**; the cursor is a candle that lights up whatever is near it. Things light up smoothly and fade back **slowly**, leaving a trail.

### 4.1 Reveal value

Every revealable element has a value `v` in `[0, 1]`:

- `target = max(0, 1 − distance / R)` when the pointer is active, else `0`. `distance` is measured from the pointer to the **nearest edge of the element's bounding box** (not its center, so wide paragraphs work). `R = 150px` on desktop for numbers, tags and text; **`R = 170px` for labels and the subtitle** (they are small).
- `v = max(target, v * 0.992)` each frame (slow decay; ~2 s to fade). Snap to `0` below `0.002`.
- If the element is **forced** (see 4.3), `target = 1`.

### 4.2 Visual mapping (base state → fully revealed)

Opacity = `base + (1 − base) * v`. Blur = `baseBlur * (1 − v)`. Update only `opacity`, `filter`, `transform`, `box-shadow`. Use one shared `requestAnimationFrame` loop (or GSAP ticker).

| `data-reveal` | element | opacity (base) | blur (base) | extra |
|---|---|---|---|---|
| `label` | `КОМАНДА В ЦИФРАХ`, `ЩО МИ ВМІЄМО РАЗОМ` | 0.14 | 3.5px | — |
| `subtitle` | numbers subtitle (italic) | 0.12 | 3px | — |
| `number` | each number cell (number + caption) | 0.12 | 3px | count-up starts once when `v > 0.6` |
| `tag` | each skill tag | 0.07 | 5px | scale `0.94 → 1`; box-shadow glow up to `0 0 18px` of `--accent` at 50%; border-color alpha `0.25 → 0.9` |
| `text` | each paragraph (label + text as one unit) | 0.16 | 1.5px | — |

On mobile (`max-width: 639px`) cap every blur at **3px**.

**Config:** put these base values in **one config object** at the top of `about.js`:

```js
const REVEAL = {
  label:    { opacity: 0.14, blur: 3.5, radius: 170 },
  subtitle: { opacity: 0.12, blur: 3,   radius: 170 },
  number:   { opacity: 0.12, blur: 3,   radius: 150 },
  tag:      { opacity: 0.07, blur: 5,   radius: 150 },
  text:     { opacity: 0.16, blur: 1.5, radius: 150 },
};
```

Each revealable element gets `data-reveal="label|subtitle|number|tag|text"`. Do not hardcode these values in CSS or elsewhere. (Tuning tip for the team: if the projector washes out the dim state, raise the `label` and `subtitle` opacity to about `0.25`.)

### 4.3 Auto-reveal (mandatory — the site is presented on a projector)

The effect must never depend on a mouse being available.

- When `#about` is ≥ 35% in the viewport for the first time, wait **1.2 s** (the visitor sees the dim "sleeping" state with only the hint sharp), then **force-reveal elements one by one with a stagger of 0.22 s in exactly this order**, so every heading appears just before its content:
  1. `КОМАНДА В ЦИФРАХ` label
  2. numbers subtitle
  3. the four number cells (count-up starts as each passes `v > 0.6`)
  4. `ЩО МИ ВМІЄМО РАЗОМ` label
  5. skill tags, one by one in DOM order
  6. the three paragraphs, then the closing line
- A forced element holds `v = 1` for **4 s** after its reveal, then is released and decays to a **resting state** instead of 0: `v = 0.55` on desktop, `v = 0.7` on touch. Labels use the same resting value. From the resting state the cursor can push elements back up to 1.
- So the final state is always readable; the cursor only adds the "candle" glow and a trail.
- The **hint line** stays sharp the whole time and fades out after the first pointer movement inside the section **or** after the auto-reveal sequence finishes, whichever comes first.
- A small ghost button **«Показати все»** (Philosopher, small caps, `--accent` outline) at the bottom-right of the section forces everything, **including labels and the subtitle**, to `v = 1` immediately. This is the presenter's emergency button.

### 4.4 Pointer visuals (desktop only, `(hover: hover) and (pointer: fine)`)

- Inside `#about` only, hide the native cursor (`cursor: none`) and show a 14px ring (1px `--accent` border, glow `0 0 12px` at 60%) that follows the pointer 1:1.
- A soft radial light layer follows the pointer: `radial-gradient(circle 170px at var(--x) var(--y), rgba(185,167,232,.18), rgba(185,167,232,.05) 55%, transparent 75%)`, fade in/out 0.4 s on enter/leave.
- Sparkles: tiny 3px dots spawn near the pointer at most once every 80 ms, drift up 16px while fading out over 0.9 s, and are removed afterwards. Cap simultaneous sparkles at 12.
- Do not use `cursor: none` outside `#about`.

### 4.5 Touch devices (`(hover: none)`)

- No ring, no sparkles.
- Auto-reveal runs as in 4.3; **touch and drag** inside the section acts as the candle (use Pointer Events with `touch-action: pan-y` so vertical scrolling is not blocked; only horizontal movement or a stationary touch drives the reveal).
- Resting state is `v = 0.7`.

### 4.6 Count-up

Each number counts from 0 to its `value` once, in 900 ms, `easeOutCubic`, when its `v` first exceeds 0.6. The final text is the plain integer. Never count again in production.

### 4.7 Reduced motion

If `prefers-reduced-motion: reduce`:
- no blur, no dimming, no scale, no sparkles, no ring, no cursor hiding, no count-up animation (show final numbers);
- **all labels, subtitle, numbers, tags and text are shown immediately at full opacity**;
- the hint line and the «Показати все» button are not rendered.

## 5. Accessibility

- All text stays in the DOM and visible to screen readers: use opacity/filter only; **never** `display:none`, `visibility:hidden` or `aria-hidden` on it.
- Real headings: `<h2>` for the section if it has a title, otherwise `aria-label` on the section; group labels are `<h3>`.
- Numbers and captions read as one phrase: `<div role="group" aria-label="5 людей">`.
- Tags are not interactive (no tab stops). The «Показати все» button is a real `<button>` with a visible `:focus-visible` ring.
- The dim state is decorative: auto-reveal guarantees everything is readable within a few seconds, so there is **no contrast requirement for the dim state**. The resting state and the fully revealed state must meet ≥ 4.5:1 contrast.

## 6. Performance

- A single shared animation loop for the whole section, started only while the section is within the viewport (IntersectionObserver) and stopped when nothing is animating and no pointer is active.
- Cache element rectangles; refresh on `resize` and after fonts load, not every frame. Store them section-relative.
- Max ~25 animated elements. `will-change` only on tags and number cells, and only while `v > 0`.
- No layout shift when blur changes (blur never changes layout).

## 7. File structure additions

```
src/js/about.js          // REVEAL config, reveal loop, auto-reveal timeline, pointer + touch, count-up
src/js/render.js         // + renderAbout(finale), adds data-reveal attributes
src/styles/about.css     // layout, tags, dividers, hint, ghost button
```

Register `about.js` in `main.js` after `finale.js`.

## 8. Acceptance checklist

- [ ] On first view only the hint line is sharp; labels, subtitle, numbers, tags and text are all dim/blurred.
- [ ] After 1.2 s auto-reveal lights elements up in the order from 4.3, each heading just before its group, with no mouse input.
- [ ] After auto-reveal everything is readable (resting state), and the cursor pushes it brighter and leaves a ~2 s trail.
- [ ] «Показати все» instantly reveals everything including the labels.
- [ ] Numbers count up exactly once, ending on the values from `team.json`.
- [ ] Touch devices: no hover needed, vertical scroll is never blocked.
- [ ] `prefers-reduced-motion`: static, fully visible block, no hint, no button.
- [ ] No horizontal scroll at 360px; numbers become a 2×2 grid; text stays within 560px or viewport minus 40px; blur capped at 3px on mobile.
- [ ] No console errors; the loop stops when the section is off-screen (check in DevTools Performance).
- [ ] Editing only `team.json → finale` changes all texts, numbers and tags.
- [ ] All base opacity/blur/radius values live in the single `REVEAL` config object.

## 9. Milestone

Add as **Milestone 7b** (after the World card, before the responsive pass): build `#about` statically first (layout and data), show me a screenshot-ready state; then add the reveal effect with the `REVEAL` config; then auto-reveal with the exact order; then touch and reduced-motion. Stop after each step and wait for my OK.
