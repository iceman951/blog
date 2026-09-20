# Icerust Astro blog

Use this map only when the current workspace matches the icerust blog structure. Re-read actual files: features and call sites can change. Do not carry previous findings forward without verification.

## Inspection map

| Concern | Starting points |
| --- | --- |
| Content and IDs | `src/content.config.ts`, target file in `src/content/blog/` |
| Metadata and call sites | `src/components/BaseHead.astro`, `src/layouts/BlogPost.astro`, `src/pages/blog/[...slug].astro` |
| Article schema | `src/components/BlogPostingSchema.astro` and where the blog route renders it |
| Sitemap dates and translations | `scripts/blog-sitemap-entries.mjs`, `astro.config.mjs` |
| Indexing directives | `public/robots.txt`, rendered head, hosting configuration, and live response headers |
| Identity | `src/consts.ts`, About page, and visible article attribution |
| Internal discovery | Blog index, `src/lib/posts.ts`, series content/routes, and article links |
| Language | `src/i18n.ts`, content `lang`/`translationKey`, page language, and alternate links |

## Repository-specific checks

- Trace title, description, heroImage, and language from content through route/layout to metadata and schema. A hero in the article body does not establish that `og:image` uses it. Check fallback behavior separately from whether image metadata exists.
- `updatedDate` supplies sitemap `lastmod` when present, otherwise `pubDate` is used. For substantive revisions of published articles, follow `AGENTS.md` and use a truthful update date if edits are authorized. Do not bump dates for an audit alone, infer them from git, or promise that a change forces Google to recrawl.
- The Thai filename rule (`foo.th.md` or `foo.th.mdx` to `/blog/th/foo/`) appears in both content ID generation and the sitemap script. Compare their actual behavior, including the file sets they cover. If a routing fix is requested, keep both implementations aligned.
- Posts sharing `translationKey` form a translation set. Verify actual siblings and reciprocal URLs; a key alone is not proof that a translation exists. Each language should use its appropriate canonical rather than automatically pointing all languages to English.
- Validate `BlogPosting` in the rendered head of the article route. Shared layouts may also serve non-article pages; importing the component is not proof that every target uses it. Verify `author.name` represents the visible author rather than assuming a site title is a person.
- Distinguish `series`/`seriesOrder` and tags in frontmatter from actual crawlable navigation. Tags do not inherently imply tag archive pages exist.
- Inspect current draft handling rather than assuming draft frontmatter or future dates exclude a post. A content loader can include every matching Markdown file.
- Search Console verification may be conditional on an environment value or verified by DNS. Missing local tag evidence does not prove the property is unverified; never print verification tokens or credentials in the report.

Use `package.json` to identify verification commands. If starting the server, follow the current `AGENTS.md` background-server instructions. Read the relevant Astro guide linked by `AGENTS.md` before making related implementation changes.
