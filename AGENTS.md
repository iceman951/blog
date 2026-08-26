## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Content and SEO

The sitemap's `<lastmod>` comes from post frontmatter, not from git. When revising a
published post, add or bump `updatedDate` — otherwise Google keeps seeing the original
`pubDate` and has no reason to recrawl.

Posts sharing a `translationKey` become an hreflang set in the sitemap. The pathname rule
(`foo.th.mdx` -> `/blog/th/foo/`) is written twice: `generateId` in `src/content.config.ts`
and `scripts/blog-sitemap-entries.mjs`. Change one, change the other.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
