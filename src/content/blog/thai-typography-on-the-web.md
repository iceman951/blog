---
title: 'Thai is not a font fallback'
description: 'Seven things that break when you set Thai text with a layout tuned for English: synthesized bold smearing tone marks, leading that fits Latin and not Thai, word counts that come out near zero, and a date that reads 2569.'
pubDate: 'Sep 13 2026'
tags: ['Typography', 'Thai', 'CSS']
lang: 'en'
translationKey: 'thai-typography-on-the-web'
---

Most writing about non-Latin web typography is about CJK. Thai gets a line in the font stack and a shrug. That is roughly what I had been doing on this blog: every article here exists in English and Thai, and the Thai side had been inheriting a layout designed around an English serif.

It mostly looked fine. "Mostly fine" is how this kind of problem hides — the text is legible, nothing overlaps badly enough to notice at a glance, so nobody files a bug. These are the seven things I found when I actually looked, in rough order of how much they matter.

## 1. Synthesized bold smears the tone marks

This is the one that changed my layout the most.

Thai stacks marks vertically. A syllable can carry an upper vowel, a tone mark above that, and a lower vowel below the consonant — four levels in one line box. When the browser cannot find the weight you asked for, it does not give up; it fakes one, usually by smearing the glyph outward. On Latin that produces a slightly mushy bold. On Thai it thickens the tone marks and the gaps between the stacked pieces close.

My headings ask for `font-weight: 600`, which suits the Latin serif. Noto Serif Thai offers 600 — the family ships 100 through 900 — but I only load 400 and 700:

```js
{
	provider: fontProviders.google(),
	name: 'Noto Serif Thai',
	cssVariable: '--font-thai',
	weights: [400, 700],
	styles: ['normal'],
}
```

So a Thai heading asked for a weight that was not in the browser's hands and got a synthetic one. The fix is to map Thai onto the weights I actually loaded:

```css
:lang(th) h2,
:lang(th) h3 {
	font-weight: 700;
}

:lang(th) h1 {
	font-weight: 400;
}
```

Sub-heads take the real 700. Display-size headings drop to **400**, which is the part I did not expect: at 3rem a Thai heading at 700 shouts next to an English heading at 600, because Thai letterforms already carry more visual weight per character. I only worked that out by putting the two languages side by side at full size.

The general version of this trap: **any weight in your type scale that your non-Latin font is not loaded at will be synthesized silently.** There is no console warning. Audit your scale against your `@font-face` list, not against what the family theoretically supports.

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

Headings need the same treatment in the other direction — tight display leading that flatters English will collide Thai marks, so mine go back up to 1.45 while the English is at 1.15.

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

The `-u-ca-gregory` extension keeps Thai month names and Thai numeral formatting while switching the calendar.

A related one I hit in the same pass, on the English side: I format editorial dates with `en-GB`, which abbreviates September as **SEPT** — four letters where every other month gets three. In a date column with a fixed width, one row is wider than the rest for one month a year.

## What I would do differently next time

Set the Thai first, or at least set both at the same time. Every one of these is a case of a decision that was correct for English propagating silently into a script it was never checked against. None of them produced an error, a warning, or a failed build. The layout just quietly got worse in a language I was not looking at.

The cheapest check I know: put the same article in both languages side by side at full desktop width and look at them as pictures rather than as text. Weight mismatches, leading that is too tight, and faux-bold all show up instantly that way, and none of them show up when you read one language at a time.
