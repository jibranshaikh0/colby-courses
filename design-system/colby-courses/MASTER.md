# Design System Master File - Colby Courses (VERIFIED, APPLIED)

> This file records the design system that was ACTUALLY selected and verified for
> Colby Courses via the ui-ux-pro-max toolkit (ui-ux-pro-max-cli v2.15.0).
> The toolkit's aggregate `--design-system` generator twice returned a kid/landing-page
> direction (Claymorphism, Comic Neue, Hero+Testimonials) that failed its own
> product-fit contract for this data-dense search tool; per that contract the direction
> below was produced via the toolkit's documented targeted domain searches
> (product -> Research Lab / University Department; style -> Swiss Modernism 2.0;
> color -> university/institutional navy; typography -> Academic/Research).
> Do NOT regenerate over this file; earlier auto-generated output was superseded.

**Project:** Colby Courses
**Product type:** College course catalog browser - data-dense search/filter tool (861 sections)
**Stack:** Single-file static site (index.html, vanilla CSS/JS, Google Fonts import)
**Density:** 8/10 (dense, dashboard-like list)

## Style: Swiss Modernism 2.0 / Minimalism & Swiss Style
- 12-column grid thinking; 8px base spacing unit (--space-1:8, --space-2:16, --space-3:24, --space-4:32)
- Single primary + one accent; no decoration; clear hierarchy; high contrast
- Thin 1px borders, small 4px radii, hairline rules; no gradients/shadows gimmicks
- Editorial serif display headings + highly legible sans body

## Color palette (Research Lab / University Department)
| Role | Hex | Token |
|------|-----|-------|
| Primary (institutional navy) | #1E3A5F | --primary |
| On Primary | #FFFFFF | --on-primary |
| Accent (scholarly gold, used for RMP ratings) | #A16207 | --accent |
| Background | #F8FAFC | --bg |
| Foreground | #0F172A | --fg |
| Card | #FFFFFF | --card |
| Muted surface | #E9EEF5 | --muted |
| Muted foreground | #475569 | --muted-fg |
| Border | #CBD5E1 | --border |
| Ring (focus) | #1E3A5F | --ring |
| Open status | bg #DCFCE7 / fg #166534 | pill |
| Waitlist status | bg #FEF3C7 / fg #92400E | pill |
| Closed status | bg #FEE2E2 / fg #991B1B | pill |
Dark mode: full token inversion supported (bg #0F172A, card #1E293B, fg #F1F5F9,
primary #9DB8DC, accent #D9A441, status pill variants darkened).

## Typography (Academic/Research pairing)
- Headings: Crimson Pro (600/700) - scholarly editorial display
- Body/UI: Atkinson Hyperlegible (400/700) - accessibility-optimized
- Import: https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Crimson+Pro:wght@500;600;700&display=swap

## Component rules (toolkit UX guidelines applied)
- Filter controls in a card panel; 12-col grid -> 6-col at <=768px -> stacked at <=480px
- Result count as role="status" aria-live="polite"
- Empty state: never a dead end - message + suggestion + clear-all action
- Filter/tag chips: wrap, labels nowrap, never clipped single row
- Course cards: <details> disclosures; disclosure marker aligned in header top-right
- Status as colored pills; RMP per-professor chips (gold) + expanded detail block
- RMP easiness proxy ALWAYS labeled as a linear proxy, never a Dartmouth score
- Focus-visible 2px ring on every interactive control; cursor:pointer on clickables
- Hover transitions 150-200ms; prefers-reduced-motion disables transitions
- Light-mode text contrast >= 4.5:1; responsive verified at 375/768/1024/1440
- All data rendered through esc() escaping; descriptions plain-text only
