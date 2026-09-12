---
title: 'Thai is not a font fallback'
description: 'Eight things that break when you set Thai text with a layout tuned for English: a heading weight that resolves differently per script, leading that fits Latin and not Thai, word counts that come out near zero, and a date that reads 2569.'
pubDate: 'Sep 13 2026'
updatedDate: 'Sep 13 2026'
tags: ['Typography', 'Thai', 'CSS']
lang: 'en'
translationKey: 'thai-typography-on-the-web'
---

Most writing about non-Latin web typography is about CJK. Thai gets a line in the font stack and a shrug. That is roughly what I had been doing on this blog: every article here exists in English and Thai, and the Thai side had been inheriting a layout designed around an English serif.

It mostly looked fine. "Mostly fine" is how this kind of problem hides — the text is legible, nothing overlaps badly enough to notice at a glance, so nobody files a bug. These are the eight things I found when I actually looked, in rough order of how much they matter — the last one added after this post was published, because writing it is what uncovered it.

> **Corrected twice, same day.** The first version said Thai headings were getting a
> *synthesized* bold; that was wrong, and section 1 is rewritten — CSS font matching had
> selected a real 700 face, which is a weight mismatch between scripts, not a fake bold.
> Checking that claim then turned up something worse, which is now section 8: the build was
> shipping only the Latin subset of my Thai font, so Thai was rendering from a system
> fallback the whole time. Both fixes are in the repository. I am leaving the trail visible
> because the second error is the more instructive one.

## 1. One heading weight, two different faces

This is the one that changed my layout the most.

My headings ask for `font-weight: 600`, which suits the Latin serif. Each family is a single
variable font file, declared at two discrete weights, and this is what the build actually emits:

```
Source Serif 4    font-weight: 400, 600
Noto Serif Thai   font-weight: 400, 700
```

Latin has a 600. Thai does not — not because the family lacks one (Noto Serif Thai ships
100 through 900) but because I only declared two weights of it.

Worth noting what that declaration costs, because it surprised me: all of those weights point
at **the same woff2 file**. Adding 600 to the list emits a third `@font-face` against the same
URL and downloads nothing extra. "Load fewer weights" is good advice for static fonts and
almost meaningless for a variable one — what you are choosing is how many points on the axis
the browser is allowed to match, not how many bytes you ship.

So what does the browser do with a 600 it cannot find? Not what I assumed. The CSS font
matching rules say that when the requested weight is **above 500**, the browser first looks
for available weights *at or above* the request, in ascending order. 600 is above 500, 700 is
available, so Thai renders in a **real 700 face**.

That means one heading was setting Latin at 600 and Thai at 700 — a weight mismatch between
two scripts in the same line, not a rendering artefact. (With the caveat from section 8: until
I fixed the subset, that Thai 700 was coming from a system font rather than from the family I
thought I had loaded.) And it compounds, because Thai carries
more visual weight per character than a Latin serif at the same nominal weight. At 3rem the
Thai heading did not just look slightly bolder; it looked like it was shouting.

The fix is to stop letting the fallback chain decide, and map Thai onto the weights I actually
loaded:

```css
:lang(th) h2,
:lang(th) h3 {
	font-weight: 700;
}

:lang(th) h1 {
	font-weight: 400;
}
```

Worth being precise about what each rule does. The `h1` rule is the one that changed the
rendering: display headings drop from 700 to **400**, which is the part I did not expect until
I put both languages side by side at full size. The `h2`/`h3` rule changes nothing today — 600
was already resolving to 700 — it pins the intent so that loading a Thai 600 later does not
silently restyle every sub-head.

### Where the faux bold actually lives

Synthetic bold is a real hazard for Thai, and it smears tone marks and upper vowels exactly as
you would fear. It just was not my bug. The browser only synthesizes when the face it selected
is **lighter** than what was asked for — so you get it by loading 400 alone and asking for 700,
which is the default situation if you add a Thai font to an existing design and never revisit
the weights.

The general version of the trap is one step up from either mechanism: **every weight in your
type scale resolves independently per font family, and nothing tells you what it resolved to.**
There is no console warning for "Thai took a different weight than Latin here". Audit your
scale against the `@font-face` rules your build emits, not against what the family offers on
the font vendor's website.

## 2. Thai needs more leading than Latin

Because of that vertical stacking, a line-height that is comfortable for English is tight for Thai. Descenders and upper marks from adjacent lines start to crowd.

```css
body {
	line-height: 1.75;
}

:lang(th) p,
:lang(th) li {
	line-height: 1.95;
}
```

1.75 to 1.95 sounds like a rounding error and is not. Compare two paragraphs at the same value and the Thai one reads as a denser block, which is exactly what you do not want in an article people are reading for twenty minutes.

Headings need the same treatment in the other direction — tight display leading that flatters English will collide Thai marks, so Thai headings go back up to 1.45 while the English ones sit at 1.15 for `h1` and 1.22 below it.

## 3. Italic does not exist

Thai script has no italic tradition. Ask for one and the browser obliques the glyphs mechanically, which looks like the text is falling over rather than being emphasized.

My blockquotes are italic, so:

```css
:lang(th) blockquote {
	font-style: normal;
}
```

Thai carries emphasis with weight, spacing, or just the sentence structure. If your design leans on italic for anything load-bearing — captions, quotes, figure labels — it needs a second plan for Thai.

## 4. Mixed-script paragraphs are the normal case

Thai technical writing is not monolingual. A sentence looks like this:

> Concurrency 10 ขึ้นไป CPU ของ API ตันอยู่ราว 113% ขณะที่ PostgreSQL ใช้ 180–430%

Latin words, Thai grammar, and numerals, inside one line. That means the font stack is not "pick the Thai font for the Thai page" — both faces render inside the same paragraph, constantly. The order matters:

```css
--stack-body: var(--font-serif), var(--font-thai), Georgia, serif;
```

The Latin serif comes first and handles Latin. It has no Thai glyphs, so Thai falls through to Noto Serif Thai. Reverse the order and the Thai font's Latin glyphs would take over your English text, which is a different and worse problem.

The thing to check after setting this up is not "does Thai render" — it will — but whether the two faces look like one paragraph. If their x-heights or weights disagree, every English word in a Thai sentence pops out like a highlight.

## 5. Word counts do not work

I wanted a reading-time estimate. The standard implementation splits on whitespace and divides by 200-something words per minute. Thai does not put spaces between words, so a 6,000-character Thai article splits into a few dozen "words" and reports a one-minute read.

Counting the two scripts separately fixes it:

```ts
const thaiChars = (prose.match(/[฀-๿]/g) ?? []).length;
const latinWords = prose
	.replace(/[฀-๿]+/g, ' ')
	.split(/\s+/)
	.filter(Boolean).length;

const minutes = latinWords / WORDS_PER_MINUTE + thaiChars / THAI_CHARS_PER_MINUTE;
```

I used 220 words per minute and 700 Thai characters per minute. The Thai figure is a working estimate rather than something I measured — treat it as a knob, not a constant.

## 6. Do not touch `word-break`

Since Thai has no inter-word spaces, the browser breaks lines using its own dictionary-based segmentation. It is decent. Anything you do to "help" — `word-break: break-all`, `overflow-wrap: anywhere` applied globally — overrides that and produces breaks in the middle of words.

I keep `overflow-wrap: break-word` on `body` for long URLs and otherwise leave line breaking alone.

## 7. The year is not 2569

`toLocaleDateString('th-TH')` formats in the Buddhist Era by default, so a post from 2026 is dated **2569**. That is correct for Thai civil usage and wrong for a technical blog, where readers are comparing a benchmark to software versions and release dates in the Gregorian calendar.

```ts
dateLocale: 'th-TH-u-ca-gregory', // Gregorian, not Buddhist era — a 2569 would confuse a tech post
```

The `-u-ca-gregory` extension keeps Thai month names — `ก.ย.` — while switching the calendar. It does not change the digits: `th-TH` already resolves its numbering system to `latn`, so the day and year were always Western numerals. If you want Thai digits you have to ask for them separately with `-u-nu-thai`, which gives `๑๓ ก.ย. ๒๐๒๖`.

A related one I hit in the same pass, on the English side, and it is stranger than it first looked. I formatted editorial dates with `toLocaleDateString('en-GB', { month: 'short' })`. On my laptop that gives `SEP`. On the deployed site it gave **SEPT** — four letters where every other month gets three.

Same code, same input, two answers. The abbreviation comes from CLDR data bundled with the runtime's ICU, and newer data spells out `Sept` for `en-GB`; my machine and the build container were not on the same version. So the date column was one character wider for one month a year, but only in production.

The site was also disagreeing with itself: article headers went through `toLocaleDateString`, while listings used a hardcoded array of month names, so the same post could be `SEPT` at the top of the article and `SEP` in the index. Both now come from one table of three-letter abbreviations, which is deterministic across runtimes — for a twelve-item list that never changes, locale machinery was buying me nothing and costing me a difference I could not see locally.

## 8. The font was never loaded for Thai

I found this one by checking the section above. The weight analysis only means anything if
Noto Serif Thai is the font actually drawing the Thai glyphs — so I went to look at the
`@font-face` rules the build emits, and every single one of them looked like this:

```
unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, ...
```

That is Latin. There was no face anywhere in the built site whose range covered
**U+0E01–U+0E5B**, the Thai block. I had configured a Thai font, referenced it in every stack,
written rules targeting `:lang(th)` — and shipped a build that could not render a single Thai
character from it. Every Thai glyph on this site was coming from whatever the operating system
picked after the stack ran out.

The cause is a default. My font provider configuration never specified subsets, and the default
subset list is Latin-oriented, so a Thai family was fetched with its Thai glyphs stripped:

```js
{
	name: 'Noto Serif Thai',
	cssVariable: '--font-thai',
	weights: [400, 700],
	styles: ['normal'],
	subsets: ['thai', 'latin'],
}
```

After that line, the build emits a second file whose range reads
`U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC` — the Thai block plus the combining
marks and the dotted circle that renders an orphaned mark. That file is what should have been
there all along.

Two things make this worth more than an embarrassing footnote.

The first is that **it looked fine**. macOS picked a competent Thai system font, so the pages
rendered legible Thai and I spent an evening tuning leading and weights for a typeface that was
never being used. Every visual judgement I made in the sections above was made against the
fallback.

The second is the general shape: **the font stack you wrote is not the font stack that
shipped.** The check that catches it takes ten seconds — search your built output for the
Unicode range of your script and confirm something covers it:

```sh
grep -o "unicode-range:[^;]*" dist/**/*.html | grep "U+0E"
```

If that comes back empty while your site has Thai text on it, the font in your CSS is
decoration.

## What I would do differently next time

Set the Thai first, or at least set both at the same time. Every one of these is a case of a decision that was correct for English propagating silently into a script it was never checked against. None of them produced an error, a warning, or a failed build. The layout just quietly got worse in a language I was not looking at.

The cheapest check I know: put the same article in both languages side by side at full desktop width and look at them as pictures rather than as text. Weight mismatches, leading that is too tight, and faux-bold all show up instantly that way, and none of them show up when you read one language at a time.
