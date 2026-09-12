# ICERUST — Sumi-e Minimal / Wabi-sabi Editorial

The single source of truth for this site's visual design. Implementation follows this
document; when the two disagree, this document is wrong or the code is — fix one of them,
do not let them drift.

This is a technical blog about benchmarks, backend systems and financial engineering. The
design is roughly **90% quiet editorial publication, 10% Japanese visual identity**. A reader
should recognise it as a serious engineering journal first, and notice the Japanese influence
second, as restraint rather than decoration.

---

## 1. Design philosophy

**Sumi-e minimal + Wabi-sabi editorial.** Ink on natural paper, set by someone who cares more
about the argument than the packaging.

- **Restrained.** Nothing decorative earns its place by being pretty. It earns its place by
  making the content easier to read or easier to navigate.
- **Content-first.** Long technical prose, dense tables and code are the primary objects. Every
  other decision serves them.
- **Ma (間).** Intentional emptiness is a design element, not wasted space. Wide screens get
  more margin, not more content. A section may end well before the fold.
- **Asymmetric where appropriate.** Article metadata sits in a margin; listings hang dates in a
  left column. Nothing is centred for its own sake except the brand seal.
- **Subtle imperfection.** Hairlines in a warm grey rather than black, paper that is slightly
  uneven, a seal that sits slightly off the baseline. Nothing is machined.
- **Timeless.** No trend-dated surface: no glass, no gradient, no glow.

---

## 2. Color system

Washi paper and sumi ink. No pure white, no pure black.

```css
--paper: #f4efe4;       /* page ground */
--paper-alt: #ebe4d6;   /* recessed surfaces, table head, inline code */
--paper-deep: #e3dbca;  /* rare: hover ground, selected row */

--ink: #1e1c19;         /* headings, strong text */
--ink-soft: #4b4740;    /* body text */
--ink-muted: #777064;   /* metadata, captions, secondary */

--line: #c9bfae;        /* structural rules */
--line-light: #ddd5c8;  /* table rows, soft separators */

--vermilion: #a63d32;   /* seal, active indicator, links */
--vermilion-dark: #843028;

--indigo: #263746;      /* rare structural dark */
--code-bg: #182128;
--code-text: #e8dfcd;
```

**Vermilion is a seal, not a theme.** It appears as the hanko mark, the active-nav indicator,
the code-block edge, and link underlines. It never becomes a filled button, a badge row, or a
background for a block of text.

Body text is `--ink-soft` on `--paper`: 8.4:1. Metadata is `--ink-muted` on `--paper`: 4.6:1.
Vermilion on paper is 5.6:1, so it is safe for text as well as ornament.

Legacy token names (`--accent`, `--cream`, `--black`, `--gray*`) remain defined in
`global.css` as aliases onto this palette, so any component not yet individually restyled
still renders in the new system instead of the old cream-and-terracotta one.

### Washi texture

Procedural only — three very low-opacity `repeating-linear-gradient` layers plus one radial
wash on `body`, no image request. It must be barely perceptible: if you can see a pattern,
turn it down.

---

## 3. Typography

Editorial, not app-like.

| Role | Family | Usage |
| --- | --- | --- |
| Display | **Noto Serif JP** 400/600 | site title, article titles, section headings, the `氷錆` mark |
| Body | **Source Serif 4** 400/600 + italic | prose, lists, blockquotes |
| Meta | **Inter** 400/500 | dates, kickers, labels, table cells, captions, nav |
| Thai | **Noto Serif Thai** 400/700 | any Thai run, paired with both serif roles |
| Code | system monospace stack | inline and block code |

Noto Serif JP is a Mincho-style face, which gives headings vertical stress and fine serifs
without importing a display font that only works in Latin. It carries the Japanese mark and
the Latin headings with one download.

Rules:

- Headings are set in display serif at `font-weight: 600`, never 700+, with `letter-spacing`
  slightly negative at large sizes and `line-height` 1.15–1.3.
- Body is 19px at desktop, 17px at mobile, `line-height: 1.75`. Measure 68–72 characters.
- **Section labels** (`LATEST WRITINGS`) are Inter, 0.7rem, `letter-spacing: 0.22em`, uppercase,
  `--ink-muted`, and are paired with a Japanese serif line above them (`最新の記事`).
- **Tags** are small square-cornered chips on `--paper-alt` with a hairline — not rounded pills,
  no colour fill. In listings they collapse to a middot-separated meta line (`Bun · Benchmark`).
- No oversized SaaS hero type. The largest type on the site is the homepage wordmark, and it is
  a wordmark, not a sentence.
- Avoid bold inside prose for emphasis runs longer than a few words; the content already uses
  `**bold**` for key numbers, which is the intended use.

### Thai typography

Thai is a first-class script here, not a fallback.

- Thai runs get `line-height: 1.95` in prose and 1.45 in headings — Thai needs more leading than
  Latin because of stacked vowels and tone marks.
- Thai headings use weight 700 of Noto Serif Thai, because its 600 is not a real weight and
  faux-bolding a Thai face smears the marks.
- Mixed Thai–Latin paragraphs are the norm in these articles (`framework`, `throughput`,
  `req/s`). The font stack is ordered so Latin falls to the serif and Thai to Noto Serif Thai,
  and both are set at sizes where their x-heights read as one paragraph.
- `word-break` stays default; Thai has no spaces between words and must wrap on its own rules.

---

## 4. Spacing

```css
--space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
--space-4: 1rem;     --space-6: 1.5rem;   --space-8: 2rem;
--space-12: 3rem;    --space-16: 4rem;    --space-24: 6rem;
--space-32: 8rem;
```

Section rhythm is `--space-24` between major page sections at desktop, `--space-16` at mobile.
Article header clears `--space-16` below itself before prose starts. Empty area on a large
desktop is intentional; do not add content to fill it.

---

## 5. Borders and surfaces

- Hairlines at `1px solid var(--line-light)`, structural rules at `var(--line)`.
- `border-radius: 0` everywhere except the hanko seal (2px) and images (2px).
- No shadows. The one exception is the focus ring, which is an outline.
- Cards become **editorial rows**: a bordered-top row with a hanging date column, no box.
- Recessed surfaces are `--paper-alt` with a hairline, never a floating card with a shadow.

---

## 6. Japanese visual elements

Permitted, in this quantity:

- **One hanko seal** (`氷錆`, vermilion, 2px radius, slight rotation) in the header and footer.
- **One ink mountain silhouette**, as an inline SVG on the homepage hero only, at ~7% opacity.
- **Thin brush dividers** — an SVG path with varying stroke width — between homepage sections.
- **`氷錆` as a secondary mark** beside ICERUST, always smaller and in `--ink-muted` or inside
  the seal.
- **One ink plum branch**, inline SVG, entering from a corner at ~10% opacity: bottom-left on the
  blog listing, top-right on article pages. Never both on the same corner, never more than one
  per page.
- **Vertical marginalia** on large screens only, `writing-mode: vertical-rl`, `--ink-muted`, at
  0.8rem: `継続は力なり` ("perseverance is strength") on the homepage, `技術は旅である`
  ("technology is a journey") on article pages. Both are real sentences; both are hidden below
  1180px rather than reflowed.

Not permitted: torii, sakura, waves, samurai, geisha, anime, decorative kana used as texture,
or Japanese text whose meaning the author cannot state. `氷錆` means *ice rust* — it is a literal
translation of the brand, which is why it is allowed to appear at all.

---

## 7. ICERUST identity

**ICERUST** is the wordmark, set in display serif with `letter-spacing: 0.2em` and always
larger and darker than the Japanese mark. `氷錆` supports it: either as a small muted line
beneath, or inside a 28px vermilion seal. The author's personal name, Vorrapong Kertnat,
remains the `SITE_TITLE` used for SEO and the footer copyright; ICERUST is the publication.

---

## 8. Layout

- Article prose: **700px**. Article furniture (header, hero figure) may reach 880px.
- Listing and homepage content: 960px, inside a 1180px outer frame that holds marginal
  elements on large screens.
- Wide objects — benchmark tables, charts, code — break out to 100% of the 880px furniture
  width and scroll inside their own container. The page itself never scrolls sideways.

---

## 9. Responsive design

Breakpoints: 1180px (drop marginal column), 860px (single column, nav wraps), 560px (compact
type and spacing).

Mobile is not a shrunk desktop: the hanging date column in listings becomes an inline meta
line, the article header's marginal metadata moves above the title, and section padding drops
one step on the spacing scale. Type gets smaller but leading does not tighten.

---

## 10. Accessibility

- Body contrast 8.4:1, metadata 4.6:1, links 5.6:1 — all AA or better.
- Focus: `outline: 2px solid var(--vermilion); outline-offset: 3px`, never removed.
- Semantic HTML preserved: one `h1` per page, `article`, `nav`, `figure`/`figcaption`,
  `time datetime`, `th scope` where the existing markup has it.
- Touch targets stay ≥44px in nav, language switcher and footer controls.
- Charts keep their `role="img"` and `aria-label`, and every chart is backed by a real table.
- `prefers-reduced-motion: reduce` disables all transitions and reveals.

---

## 11. Animation

Only: a 200ms fade-and-rise on the article header, a 160ms link-underline expansion, a 200ms
opacity change on seal hover. Durations 150–400ms, `ease-out`. No page transitions, no
parallax, no scroll-jacking. All of it sits inside a `prefers-reduced-motion` guard.

---

## 12. Image direction

Hero images are the article's own monochrome data charts — which this blog already generates —
so they read as plates in a journal. They sit on paper with a hairline border and a caption
rather than a rounded card with a shadow. Ordinary posts need no decorative image.

---

## 13. Code blocks

`--code-bg` ink ground, `--code-text` warm paper text, `border-left: 2px solid var(--vermilion)`,
`line-height: 1.6`, horizontal scroll on overflow. Inline code is `--paper-alt` with a hairline,
not a coloured chip. Syntax highlighting stays on Astro's default Shiki theme — restrained and
already close to this palette.

Each block carries a thin header bar on `--code-bg`: the language on the left in Inter 0.7rem
uppercase, a copy button on the right. Lines are numbered with a CSS counter on Shiki's `.line`
elements, in `--ink-muted` at 0.8em, `user-select: none` so a copied selection stays runnable.
The copy button is eleven lines of vanilla JS with an `aria-live` confirmation — no dependency,
and it disappears for `print`.

---

## 14. Tables

The most important component on this site. Benchmark numbers must stay comparable at a glance.

- `font-variant-numeric: tabular-nums` so digits align in columns.
- Numeric columns right-aligned, labels left-aligned.
- Header row: `--paper-alt` ground, bottom rule in `--line`, Inter 500, uppercase, 0.68rem.
- Body rows: hairline in `--line-light`, no zebra striping, no vertical rules.
- Thin full grid: every cell carries a `--line-light` border, so a wide benchmark table reads as
  a printed grid rather than as floating rows. This is the one place the design accepts more rules
  rather than fewer, because comparing across both axes is the whole point of the table.
- Wrapped in a scroll container; a `sticky` first column is not used because these tables have
  short label columns and it fights horizontal scroll on mobile.

---

## 15. Anti-patterns

Explicitly out: Tailwind-demo look, startup landing pages, bento grids, rounded cards,
glassmorphism, neon, gradient grounds, giant CTA buttons, badge rows, drop shadows, Japanese
clichés, animation for its own sake, dense layouts that fear white space.

---

## 16. Component inventory

| Component | Role |
| --- | --- |
| `HankoMark.astro` | vermilion `氷錆` seal, sizes `sm`/`md`, optional link |
| `BrushDivider.astro` | thin variable-width ink rule between sections |
| `InkMountains.astro` | single sumi-e silhouette, homepage hero only |
| `Kicker.astro` | uppercase Inter label, replaces tag pills |
| `ArticleRow.astro` | editorial listing row: hanging date, title, meta, hairline |
| `Header.astro` | wordmark + seal, text nav with vermilion active indicator, TH\|EN |
| `Footer.astro` | one rule, wordmark, utility links, no columns |
| `BlogPost.astro` | article furniture: kicker, title, date · reading time, hero plate, prose |
| `ChartFrame.astro` | figure with Inter title and caption on paper |
| `PlumBranch.astro` | corner ink branch, `corner` prop, decorative and `aria-hidden` |
| `VerticalNote.astro` | vertical Japanese marginalia, large screens only |
| `TagList.astro` | square tag chips from the optional `tags` frontmatter field |

`tags` is a new **optional** field on the blog collection schema, so posts without it keep
rendering unchanged. The six existing posts were given accurate topical tags (`Bun`, `Benchmark`,
`PostgreSQL`, …) as part of this redesign; no prose was edited.

Tokens live in `src/styles/global.css`. Chart series colours live in `src/lib/chart.ts` and are
derived from this palette — ink, indigo and vermilion — not chosen per chart.
