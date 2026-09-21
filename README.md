# ICERUST Blog

The source for [blog.icerust.dev](https://blog.icerust.dev), the personal technical blog of
[Vorrapong Kertnat](https://blog.icerust.dev/about/). It publishes practical notes and
experiments about TypeScript, backend systems, benchmarks, DevSecOps, and financial
engineering in English and Thai.

The site is a fully prerendered [Astro](https://astro.build/) project written in TypeScript.
Posts use Markdown or MDX, dependencies are managed with Bun, and the generated static assets
are deployed to Cloudflare Workers.

## Features

- English and Thai posts with a client-side language preference
- Typed content collections for posts and multi-part series
- Localized routes and `hreflang` sitemap entries for translated posts
- Sitemap freshness based on each post's `pubDate` or `updatedDate`
- RSS, canonical URLs, Open Graph metadata, and Person/BlogPosting structured data
- Consent-aware Google Analytics integration
- Accessible, data-driven charts for benchmark articles
- A custom responsive editorial design documented in [DESIGN.md](./DESIGN.md)

## Requirements

- [Node.js](https://nodejs.org/) 22.12.0 or newer
- [Bun](https://bun.sh/)

Install the dependencies from the repository root:

```sh
bun install
```

## Development

Start Astro's development server in the background:

```sh
bun run astro -- dev --background
```

The site is available at `http://localhost:4321` by default. Manage the background server with:

```sh
bun run astro -- dev status
bun run astro -- dev logs
bun run astro -- dev stop
```

Other project commands:

| Command | Purpose |
| --- | --- |
| `bun test` | Run the Bun unit tests in `src/lib` |
| `bun run build` | Generate the production site in `dist/` |
| `bun run preview` | Preview the production build locally |
| `bun run astro -- --help` | Show the Astro CLI help |

## Project structure

```text
.
├── benchmark/             # Benchmark harnesses and analysis utilities
├── public/                # Static files copied to the build unchanged
├── scripts/               # Build and sitemap support scripts
├── src/
│   ├── assets/            # Images and generated article graphics
│   ├── components/        # Shared UI, metadata, charts, and illustrations
│   ├── content/
│   │   ├── blog/          # English and Thai Markdown/MDX posts
│   │   └── series/        # Series landing-page content
│   ├── data/              # Structured datasets used by MDX charts
│   ├── layouts/           # Article layouts
│   ├── lib/               # Post, series, date, reading, and chart helpers
│   ├── pages/             # Astro routes, RSS, and dynamic content pages
│   └── styles/            # Global design tokens and styles
├── astro.config.mjs       # Astro, sitemap, fonts, and canonical site config
├── DESIGN.md              # Visual design source of truth
├── src/content.config.ts  # Content collection schemas and localized IDs
└── wrangler.jsonc         # Cloudflare static-assets deployment config
```

## Configuration

- `src/consts.ts` contains the author and site metadata, social links, Google Analytics
  measurement ID, and Google Search Console verification token.
- `astro.config.mjs` defines the canonical origin, integrations, build behavior, and fonts.
- `src/i18n.ts` contains English and Thai interface strings used outside article bodies.
- `DESIGN.md` is the source of truth for the visual system and accessibility decisions.

## Writing posts

Add posts to `src/content/blog/` as Markdown (`.md`) or MDX (`.mdx`). A post requires a title,
description, and publication date. The remaining fields are optional, although declaring
`lang` explicitly is recommended.

```yaml
---
title: 'Post title'
description: 'A concise summary used in listings and metadata.'
pubDate: '2026-09-21'
updatedDate: '2026-09-22'
heroImage: '../../assets/example.svg'
lang: 'en'
tags: ['Astro', 'TypeScript']
translationKey: 'post-title'
series: 'example-series'
seriesOrder: 1
---
```

The frontmatter fields are:

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | Post title |
| `description` | Yes | Summary used in listings and page metadata |
| `pubDate` | Yes | Original publication date |
| `updatedDate` | No | Most recent substantive revision date |
| `heroImage` | No | Image imported through Astro's content image helper |
| `lang` | No | `en` or `th`; defaults to `en` |
| `tags` | No | List of topic labels |
| `translationKey` | No | Shared key that connects language variants |
| `series` | No | Reference to the English series ID |
| `seriesOrder` | No | Positive integer position in the series |

`series` and `seriesOrder` must either both be present or both be omitted.

### Translations and routes

English posts use the base filename. Thai translations add `.th` before the extension:

```text
src/content/blog/example-post.md     -> /blog/example-post/
src/content/blog/example-post.th.md  -> /blog/th/example-post/
```

The same convention works for `.mdx` files and series entries. Give translated posts the same
`translationKey` so the sitemap emits the complete `hreflang` set, including the English
`x-default` URL. A translation is still a complete post and must provide its own localized
title, description, dates, and `lang` value.

The localized pathname rule is implemented in both `src/content.config.ts` and
`scripts/blog-sitemap-entries.mjs`. If the filename-to-route convention changes, update both
implementations together.

### Updating a published post

Set or advance `updatedDate` whenever a published article receives a substantive revision.
The sitemap uses `updatedDate` when present and otherwise falls back to `pubDate`; changing the
body without updating the date gives search engines no new freshness signal.

### Series

Create series metadata in `src/content/series/`:

```yaml
---
title: 'Series title'
description: 'What readers will learn from the series.'
lang: 'en'
featured: false
disclaimer: 'Optional contextual or affiliation disclaimer.'
---
```

`title` and `description` are required. `lang` defaults to `en`, `featured` defaults to `false`,
and `disclaimer` is optional. Thai series translations follow the same `.th.md` or `.th.mdx`
naming convention. Posts in either language reference the English series ID; the series helpers
resolve the matching localized entry.

## Deployment

Build the static site first:

```sh
bun run build
```

With Wrangler authenticated for the intended Cloudflare account, deploy the contents of
`dist/` using the checked-in assets-only Worker configuration:

```sh
npx wrangler deploy
```

`wrangler.jsonc` points Cloudflare at `./dist` and enables automatic trailing-slash handling.
The site is fully prerendered and does not use a Cloudflare runtime adapter or Worker entrypoint.

## Attribution

This project began with Astro's blog starter, whose theme was based on
[Bear Blog](https://github.com/HermanMartinus/bearblog). The current design and implementation
have since been customized for ICERUST.
