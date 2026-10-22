# PROMPTS.md — готовые сообщения для Cursor

Как работать: открыть папку проекта в Cursor, режим **Agent**, отправлять сообщения ниже по одному. После каждого этапа проверить результат, сделать коммит в Git и только потом отправлять следующее.

## Перед стартом

1. Положите `CURSOR_PROMPT.md` от дизайнера в корень проекта (рядом с `DESIGN.md`).
2. Установите Node 20+ и Git. Проверка: `node -v`, `git -v`.
3. В папке проекта выполните `git init` и сделайте первый коммит.

## Сообщение 0 (старт и этап 1)

```
Read CURSOR_PROMPT.md, DESIGN.md and README.md completely before writing any code.

The folder already contains: CURSOR_PROMPT.md, DESIGN.md, README.md, .gitignore, .cursor/rules/design.mdc, public/favicon.svg, public/assets/logo/neo-arcana-moon-card.svg and src/data/team.json. Do not delete or rewrite them. You may add fields to team.json only if the spec requires it.

Set up the Vite project manually in this folder (package.json, vite.config.js, index.html) instead of running an interactive scaffolder, so existing files stay untouched. In vite.config.js set base: './'.

Then do Milestone 1 only: scaffold, fonts, tokens, base styles, folder structure, and a page that shows the palette and type samples (with Ukrainian text to prove the Cyrillic fonts work). Stop and tell me how to run it and what to check.
```

## Этапы 2–10

Этап 2:
```
Milestone 1 approved. Do Milestone 2: hero, sticky header, star field canvas and the intro animation (CURSOR_PROMPT.md sections 5, 5.1, 6.1, 6.2 and the button/header-logo parts of 6.7). Stop when done and tell me what to check.
```

Этап 3:
```
Milestone 2 approved. Do Milestone 3: render everything from team.json and build the static deck: desktop fan, tablet layout, mobile scroll-snap carousel with dots, card front and card back, image placeholders (sections 4, 5.2, 10). No animation yet. Stop when done.
```

Этап 4:
```
Milestone 3 approved. Do Milestone 4: deck animation from section 6.3: deal on scroll, hover tilt and glare on pointer devices, focus-visible lift, idle float, and the counter "Відкрито N з 5" with a number roll. Use gsap.matchMedia as specified. Stop when done.
```

Этап 5:
```
Milestone 4 approved. Do Milestone 5: the profile modal (sections 5.3 and 6.4): desktop two-column layout, mobile bottom sheet, GSAP Flip open/close with the fallback, prev/next, keyboard, swipe on the portrait, hash routing, focus trap, viewed state. Stop when done.
```

Этап 6:
```
Milestone 5 approved. Do Milestone 6: team spread with four flip cards and the connector line (sections 5.4 and 6.5). Stop when done.
```

Этап 7:
```
Milestone 6 approved. Do Milestone 7: finale with the World card, lock/unlock logic, the "Показати одразу" manual unlock, and the footer (sections 5.5 and 6.6). Stop when done.
```

Этап 8:
```
Milestone 7 approved. Do Milestone 8: responsive and polish pass. Check widths 360, 390, 768, 1024, 1280, 1440, 1920, reduced motion, projector text sizes and safe-area insets. Fix what you find and list what you changed.
```

Этап 9:
```
Milestone 8 approved. Do Milestone 9: quality pass. Accessibility audit, meta and Open Graph tags, image loading attributes, clean console, and anything that would keep Lighthouse mobile below the targets in section 8. List what you changed and what still misses a target.
```

Этап 10:
```
Milestone 9 approved. Do Milestone 10: extend the existing README.md only where something is missing (do not remove the Russian sections), and confirm the Vercel settings: framework Vite, build npm run build, output dist. Tell me if anything in the repo would break the deploy.
```

## Шаблоны для правок

Баг:
```
Bug: <what I see>. Where: <device or width, browser>. Expected: <what should happen>. Find the cause and fix only this. Do not refactor or change anything else.
```

Мелкая правка внешнего вида:
```
Change only <element> in <file>: <what to change>. Keep all colors and fonts from DESIGN.md.
```

Телефон:
```
On a 360px wide phone <problem>. Fix it, preferably with CSS only. There must be no horizontal page scroll.
```

Тормозит:
```
The page is laggy on my phone. Profile it and reduce the load: fewer stars, leftover will-change, image sizes, anything animating something other than transform and opacity. Do not remove features without asking me.
```

Cursor забыл стиль:
```
Re-read DESIGN.md and the relevant section of CURSOR_PROMPT.md, then redo the last change so it follows them.
```

## Что проверять после каждого этапа

- Запустить `npm run dev -- --host` и открыть сайт на телефоне.
- Открыть консоль браузера (F12): ошибок и предупреждений быть не должно.
- Сузить окно до 360 px: нет горизонтального скролла.
- Сделать коммит: `git add . && git commit -m "milestone N"`.

## Если Cursor всё сломал

```
git log --oneline                     # найти нужный коммит
git checkout <hash> -- <file>         # вернуть один файл
git reset --hard <hash>               # вернуть весь проект (удалит несохранённые правки!)
```
