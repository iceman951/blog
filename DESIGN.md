# ICERUST — Systems Engineering Lab & Benchmark Journal

The single source of truth for this site's visual design. Implementation follows this
document; when the two disagree, this document is wrong or the code is — fix one of them,
do not let them drift. Section 12 lists what is still outstanding.

ICERUST is a bilingual (TH/EN) engineering journal by Vorrapong Kertnat: runtime and framework
benchmarks on a fanless MacBook Air, the internals of the tools those benchmarks exercise, CI
and deploy post-mortems, and a learning journal from an M.Sc. in Financial Engineering. The
design aesthetic is **Systems Engineering Lab**: precise, readable, and quiet. A reader should
recognise it as a lab notebook that shows its working, not as a product page.

---

## 1. What the content actually is

Every rule below exists to serve one of these. When a new rule does not trace back to this
section, it does not belong in the design.

| Kind | Posts today | What it is made of |
| --- | --- | --- |
| **Benchmark reports** | Bun HTTP frameworks, energy per request, Elysia vs Hono + PostgreSQL | A machine/environment table, long methodology prose, many numeric tables (one post has 70+ table rows), SVG charts with error bars, `sh` reproduce blocks, downloadable raw evidence |
| **Engineering notes** | Why ElysiaJS is fast, the Wrangler deploy post-mortem | `ts` / `js` / `jsonc` / `sh` code, version-pinned notes in blockquotes, flow diagrams, source links pinned to a tag |
| **Learning journal** | The Financial Engineering series | Prose only, a series disclaimer, episode navigation, one diagram |

Three properties of the writing set the tone more than the topics do:

- **It refuses to name winners it cannot defend.** The Elysia vs Hono post ends with "this
  article names no winner" because the gap (1.75%) is inside run-to-run noise (2.94%). Results
  are reported as *median and min–max* or *mean ± 1 SD across five rounds*, never as a single
  best run.
- **It leads with caveats.** Ambient temperature, the load generator's own CPU share, a sampler
  that costs 1.5–2.7% throughput — these are first-class content, not footnotes.
- **It is long, first-person prose, in two scripts.** Every post exists in Thai and English;
  Thai posts mix in Latin terms (`framework`, `throughput`, `req/s`) in nearly every sentence.

## 2. Design philosophy

- **Show the spread, not the winner.** Design never adds certainty the data does not have.
  No winner badges, no green "+42%" pills, no hero number without its range.
- **Prose first, data close behind.** Most of every post is paragraphs. The prose measure,
  line-height and Thai rendering matter more than any component.
- **Instrument-grade, not instrument-themed.** Precision comes from 1px hairlines, tabular
  figures and exact version numbers — not from fake telemetry, blinking status lights or
  terminal cosplay.
- **Two themes, both first-class.** Light and dark are each designed and each validated for
  contrast; neither is an automatic inversion of the other.
- **Bilingual parity.** Thai and English get matched weights, script-appropriate leading, and
  no layout shift when the language switches.
- **No ornament without a job.** No grid-pattern backgrounds, glows, gradients, or decorative
  imagery. The previous Japanese ornaments (plum branch, ink mountains, brush dividers, vertical
  marginalia, hanko seal) are retired — they had no relationship to the content.

---

## 3. Color system

Light and dark are defined as one token set. When no preference is stored, the theme follows
`prefers-color-scheme` (§8). Every text token below meets WCAG AA (4.5:1) on `--bg` and
`--surface`; the ratios in comments were computed, not estimated.

```css
/* Light — also the fallback when no theme can be determined */
:root,
:root[data-theme="light"] {
  color-scheme: light;

  --bg: #f8fafc;
  --surface: #ffffff;           /* cards, table body, plates */
  --surface-alt: #f1f5f9;       /* table head, blockquote, inline code */

  --text: #0f172a;              /* 17.1:1 on --bg */
  --text-muted: #475569;        /*  7.2:1 — metadata, captions, table head */
  --text-faint: #64748b;        /*  4.6:1 — dates, counts. Not on --surface-alt (4.3:1) */

  --border: #e2e8f0;            /* hairlines, table grid */
  --border-strong: #cbd5e1;     /* card edges, focused/active borders */

  --accent: #0369a1;            /*  5.7:1 — links, active nav, focus ring */
  --accent-hover: #075985;
  --accent-subtle: rgb(3 105 161 / 0.08);   /* active row, selected chip */

  --code-bg: #0f172a;           /* code stays dark in both themes */
  --code-border: #1e293b;
  --code-text: #e2e8f0;         /* 14.5:1 on --code-bg */
  --code-faint: #8291a7;        /*  5.6:1 — line numbers, language label */

  /* Charts — validated categorical set, see §7 */
  --series-1: #0369a1;
  --series-2: #c2410c;
  --series-3: #7c3aed;
  --series-neutral: #94a3b8;    /* "other", tooling, residual buckets */
  --series-neutral-2: #cbd5e1;  /* second residual bucket */
  --chart-on-series: #ffffff;   /* value labels drawn on a series fill */
  --chart-grid: #e2e8f0;
  --chart-axis: #64748b;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* same values as [data-theme="dark"] below */ }
}

:root[data-theme="dark"] {
  color-scheme: dark;

  --bg: #090d14;
  --surface: #101622;
  --surface-alt: #161f30;

  --text: #f1f5f9;              /* 17.8:1 on --bg */
  --text-muted: #94a3b8;        /*  7.6:1 */
  --text-faint: #8291a7;        /*  6.1:1 */

  --border: #1e293b;
  --border-strong: #334155;

  --accent: #22d3ee;            /* 10.8:1 */
  --accent-hover: #67e8f9;
  --accent-subtle: rgb(34 211 238 / 0.08);

  --code-bg: #0b0f19;
  --code-border: #1e293b;
  --code-text: #e2e8f0;         /* 15.5:1 */
  --code-faint: #8291a7;        /*  6.0:1 */

  --series-1: #0284c7;
  --series-2: #ea580c;
  --series-3: #8b5cf6;
  --series-neutral: #475569;
  --series-neutral-2: #334155;
  --chart-on-series: #090d14;
  --chart-grid: #1e293b;
  --chart-axis: #8291a7;
}
```

The dark block is written twice in CSS (inside the media query and under `[data-theme="dark"]`)
so a stored choice always wins over the system setting in either direction.

**Accent is for navigation, not for verdicts.** Cyan marks links, the active nav item and focus.
It never colours a number to say it is good. There are deliberately **no pass/warn/fail
status colours**: nothing on this site is a pass or a fail, and the posts already handle
limitations as their own headed sections of prose.

---

## 4. Typography

Three families, one job each. All are loaded through Astro's `fonts` config in
`astro.config.mjs`; nothing else is fetched.

| Role | Family | Weights | Usage |
| --- | --- | --- | --- |
| Latin text & UI | **Inter** | 400, 500, 600 | Prose, headings, nav, metadata, table text |
| Thai text | **Noto Sans Thai** | 400, 600 | Any Thai run, prose and headings |
| Code & data | **JetBrains Mono** | 400 | Code blocks, inline code, version strings in environment tables |

Noto Sans Thai is loopless and has a real 600, so a mixed Thai–English heading renders at one
weight — no fallback to a heavier Thai face beside lighter Latin.

Rules:

- **Body prose:** 18px desktop / 17px mobile. `line-height: 1.7` for Latin, `1.9` for any
  `:lang(th)` run — Thai stacks vowels and tone marks above and below the line.
- **Headings:** weight 600 (never 700+), `letter-spacing: -0.02em` at h1/h2 sizes only.
  `line-height: 1.25` Latin, `1.45` Thai. Size steps: h1 `clamp(2rem, 4.5vw, 2.75rem)`,
  h2 `1.6rem`, h3 `1.25rem`, h4 `1.05rem`.
- **Font stacks** put Inter first and Noto Sans Thai second, so Latin words inside a Thai
  sentence stay in Inter and Thai stays in Noto. Both are set at sizes where their x-heights
  read as one line.
- **Numbers:** `font-variant-numeric: tabular-nums` on tables, chart labels, dates and reading
  time. Prose numbers stay proportional.
- **Inline code:** JetBrains Mono at `0.875em`, `--surface-alt` ground, 1px `--border`,
  `border-radius: 4px`, `padding: 0.1em 0.35em`.
- **Bold in prose** is for key numbers and short claims, as the posts already use it — never
  for whole sentences.
- `word-break` stays default; Thai wraps on its own rules.
- **The Thai subset must be requested explicitly.** A Thai family fetched without
  `subsets: ['thai', 'latin']` ships with its Thai glyphs stripped, and the site silently falls
  back to a system font. After any font change, a built page must contain a `unicode-range`
  covering `U+0E01-0E5B`.

---

## 5. Layout & spacing

```css
--space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
--space-4: 1rem;     --space-6: 1.5rem;   --space-8: 2rem;
--space-12: 3rem;    --space-16: 4rem;    --space-24: 6rem;

--measure-prose: 720px;   /* article text: ~70 Latin characters per line */
--measure-wide: 960px;    /* tables, charts, code, hero plate */
--frame: 1080px;          /* header, footer, listing pages */
```

- **Prose** sits at 720px. **Wide objects** — benchmark tables, charts, code blocks, the hero
  plate — break out to 960px and scroll horizontally *inside their own container*, which is
  focusable (`tabindex="0"`, `role="region"`, an `aria-label`). The page never scrolls sideways.
- **Gutters:** `1.5rem` side padding, `1rem` below 560px.
- **Rhythm:** `--space-16` between page sections on desktop, `--space-12` on mobile; `--space-8`
  above an `h2` in prose, `--space-6` above an `h3`.
- **Breakpoints:** 860px (nav wraps, listing meta goes inline) and 560px (compact type and
  spacing). Leading never tightens on mobile.
- **Radius:** 6px for cards, code blocks, callouts and plates; 4px for chips and inline code;
  0 for tables. No shadows anywhere — surfaces separate by border and ground colour.

---

## 6. Page anatomy

### Header
`ICERUST` wordmark (Inter 600, `letter-spacing: 0.08em`), text nav (Blog · Series · About) with
an accent underline on the current page, then `LanguageSwitcher` and `ThemeToggle`. One 1px
`--border` rule below. No status pill, no prompt glyph, no animation.

### Article header
In order: series context line (only for series posts), title, description in `--text-muted`,
then one metadata line in `--text-faint`:
`Vorrapong Kertnat · 23 AUG 2026 · Updated 13 SEP 2026 · 6 min read`, followed by tags as
chips. The byline stays: the author's name on every article is part of the site's SEO.
**The updated date is shown whenever `updatedDate` differs from `pubDate`** — benchmark posts
get revised as numbers change, and readers need to know which run they are looking at.

### Hero plate
Hero images are static files (SVG charts, PNG/WebP diagrams) and cannot follow the theme
toggle, so they always sit on a **plate**: `#ffffff` ground in both themes, 1px `--border`,
6px radius, `--space-4` padding. They are drawn with the light chart palette (§7). Posts
without a hero image get none — no stock placeholder.

### Homepage
1. A short intro (who writes this and what about) — one `h1`, two sentences, no hero number.
2. The featured series as one bordered card with its episode count.
3. **Latest posts** as rows: date in a fixed-width tabular column, title, one-line
   description, tags. A row is a link with an accent title on hover — no card per post, no
   thumbnail grid. Below 860px the date moves onto the meta line.

### Footer
One rule, wordmark, links (GitHub, LinkedIn, RSS, Privacy, cookie settings), copyright with
the author's name. No columns.

---

## 7. Benchmark presentation

This is the section the content depends on most.

### Spread is mandatory
- Every reported measurement shows its spread in the same place as its value:
  `<median> (<min>–<max>)` or `<mean> ± <sd>` in tables, error bars or range bands in charts.
- The statistic is named in the table caption or chart note: *median, min–max* or
  *mean ± 1 SD* — and when it matters, what it is not ("not confidence intervals").
- `n` (repetitions) is visible in the caption, not only in the methodology section.

### Comparisons
- A difference is **text in `--text`**, signed and with its unit: `+1.75%`, `−65 ms`.
  It is never coloured green or red.
- When a difference is inside the measured run-to-run spread, it is labelled
  `within noise` in `--text-muted` rather than given a sign.
- The baseline is labelled in the table itself (`Bun.serve (baseline)`), not implied by row
  order.

### Environment table
Every benchmark post opens its method with a **machine table**: model, chip, memory, OS, runtime
and tool versions, ambient conditions. In Markdown this is a two-column table with an empty
header row (`| | |`); the CSS detects a header whose cells are *all* empty
(`table:not(:has(thead th:not(:empty)))`), hides it and sets the first column as labels on
`--surface-alt`. A comparison table with only an empty corner cell keeps its header. Values read back
from the machine at run time (as in `PostgresBenchmarkResults`) use the same styling.

### Notes and limitations
- A blockquote is a **note**: `--surface-alt` ground, 2px `--accent` left edge, 6px radius on
  the right. The posts use it for version pins and quoted sources.
- Limitations stay prose under their own heading ("Interpretation and limitations"), as the
  posts already write them. No coloured warning boxes — they would make every caveat look like
  an error.

### Evidence and reproduction
- Raw-data downloads (under `/benchmarks/…`) are a plain list of links with file name, format
  and size, e.g. `trials.csv · CSV · 48 KB`.
- Reproduce steps are an ordinary `sh` code block. Nothing about them is hidden in `<details>`;
  long configuration dumps (like the PostgreSQL settings table) are.

### Charts
- Colour follows the **entity**, never its rank, in fixed order: `--series-1`, `--series-2`,
  `--series-3`, then `--series-neutral` and `--series-neutral-2` for residual buckets. A fourth framework is a direct
  label on a neutral mark or a separate small multiple, not a generated hue.
- Both palettes pass the dataviz validator (lightness band, chroma, CVD separation ≥ 20 ΔE,
  normal-vision floor, ≥ 3:1 against `--surface`) in their own mode.
- Chart components read colours from CSS custom properties (via `class` or `style`), not from
  hex constants in `src/lib/chart.ts`, so inline charts follow the theme toggle.
- Thin marks: 2px lines, 4px rounded data ends anchored at the baseline, 2px surface gap between
  adjacent bars. Grid in `--chart-grid`, axis text in `--chart-axis`, values and labels in text
  tokens. A label drawn on a series fill uses `--chart-on-series`; on a neutral fill, `--text`.
  tokens — never in the series colour.
- Every chart keeps `role="img"`, an `aria-label`, a legend when it has two or more series,
  and a backing data table.

---

## 8. Theme switching

- On first visit the theme follows `prefers-color-scheme`. Choosing a theme stores it in
  `localStorage` under `icerust_theme_v1` (matching `icerust_ui_language_v1`).
- An inline `<script>` in `<head>` sets `data-theme` on `<html>` from storage before first
  paint, so there is no flash of the wrong theme. It wraps storage access in `try/catch` and
  falls back to the system setting.
- `ThemeToggle` is an icon button (sun/moon) with `aria-pressed` and a visible label for screen
  readers in the current UI language. It also updates `<meta name="theme-color">`.
- Colour changes transition at `150ms ease-out` on `background-color`, `border-color` and
  `color` — inside `prefers-reduced-motion: no-preference` only.

---

## 9. Code blocks

- `--code-bg` ground in both themes, 1px `--code-border`, 6px radius, `line-height: 1.6`,
  JetBrains Mono at `0.875rem`, horizontal scroll on overflow.
- Shiki theme `github-dark` — chosen because the block is dark in both site themes.
- A thin header bar: language label on the left (`--code-faint`, 0.7rem, uppercase), copy button
  on the right with an `aria-live` confirmation. The button is hidden for `print`.
- Line numbers via a CSS counter on Shiki's `.line`, in `--code-faint`, `user-select: none`,
  so a copied selection stays runnable.

---

## 10. Tables

- `font-variant-numeric: tabular-nums`. Numeric columns right-aligned, labels left-aligned.
- Header row: `--surface-alt` ground, `--text-muted`, Inter 600 at `0.75rem`,
  `letter-spacing: 0.04em`. English headers may be uppercase; Thai headers are not transformed.
- Thin full grid: every cell carries a 1px `--border`. Comparing across both axes is the whole
  point of a benchmark table, so this is the one place the design accepts more rules, not fewer.
- No zebra striping. Hover row: `--accent-subtle`.
- Wrapped in the focusable scroll container from §5. No sticky first column — the label
  columns are short, and stickiness fights horizontal scroll on mobile.

---

## 11. Accessibility & performance

- **Contrast:** text tokens meet AA in both themes (ratios in §3). Chart marks meet 3:1 against
  `--surface`.
- **Focus:** `outline: 2px solid var(--accent); outline-offset: 2px` on every interactive
  element, never removed.
- **Semantics:** one `h1` per page, `article`, `nav`, `figure`/`figcaption`, `time datetime`,
  `th scope`, `lang` on every Thai or English run in bilingual pages.
- **Touch targets** ≥ 44px for nav, language switcher, theme toggle and footer links.
- **Motion:** theme transitions, a 160ms link-underline expansion and the existing Elysia
  flow-diagram animation — all disabled under `prefers-reduced-motion: reduce`.
- **Weight:** no UI framework or CSS framework. Astro, CSS custom properties, and small
  vanilla scripts (theme, language, copy, consent). Stylesheets stay inlined
  (`build.inlineStylesheets: 'always'`), so the total CSS must stay small enough to justify it.

---

## 12. Implementation status

Implemented: tokens and base styles (`src/styles/global.css`), fonts (`astro.config.mjs`),
the theme bootstrap and `ThemeToggle.astro`, header, footer, article layout, listings, series
pages, 404, consent dialog, chart colours from CSS variables (`src/lib/chart.ts`), and the
hero SVGs redrawn in the light palette (`scripts/build-hero-svg.ts` uses the same values).
The Japanese ornaments (`ink/*`, `HankoMark`, `VerticalNote`) are deleted.

Not components on purpose: benchmark tables, environment tables and code blocks are written in
Markdown and styled globally (§7, §9, §10), so no post has to be rewritten to adopt the design.

Outstanding — raster brand assets still carry the previous Sumi-e identity and need new artwork:

| Asset | What it shows now |
| --- | --- |
| `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | The vermilion `氷` hanko seal |
| `src/assets/icerust-og-anime.png` | Default social card and About hero: washi ground, serif wordmark, a `進` seal |
| `src/assets/why-is-elysiajs-so-fast(.th).png` | Hero/OG with washi ground and hanko mark |
