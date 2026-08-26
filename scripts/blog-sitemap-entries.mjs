// Sitemap metadata for blog posts, read straight off the Markdown frontmatter.
//
// `astro.config.mjs` cannot import `astro:content`, so the sitemap's `serialize`
// hook has no access to the content collection. This rebuilds just enough of it:
// a pathname -> { lastmod, links } lookup, where `links` carries the hreflang
// alternates for posts that share a `translationKey`.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BLOG_DIR = 'src/content/blog';

/** Pull a top-level scalar out of a frontmatter block, unquoted. */
const scalar = (frontmatter, key) => {
	const match = frontmatter.match(new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'm'));
	return match ? match[1].replace(/^['"]|['"]$/g, '') : undefined;
};

/** `YYYY-MM-DD` in the local calendar — `toISOString` would shift the date in UTC+7. */
const isoDate = (value) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * @param {string} site Absolute site origin, e.g. `https://blog.icerust.dev`.
 * @returns {Map<string, { lastmod?: string, links?: { lang: string, url: string }[] }>}
 *   keyed by pathname with a trailing slash, matching what the sitemap emits.
 */
export function blogSitemapEntries(site) {
	const posts = readdirSync(BLOG_DIR)
		.filter((file) => /\.mdx?$/.test(file))
		.map((file) => {
			const source = readFileSync(join(BLOG_DIR, file), 'utf8');
			const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';

			// Same rule as `generateId` in src/content.config.ts — keep the two in sync.
			const base = file.replace(/\.(md|mdx)$/, '');
			const id = base.endsWith('.th') ? `th/${base.slice(0, -'.th'.length)}` : base;

			return {
				pathname: `/blog/${id}/`,
				url: new URL(`/blog/${id}/`, site).href,
				lang: scalar(frontmatter, 'lang') ?? 'en',
				translationKey: scalar(frontmatter, 'translationKey'),
				lastmod: isoDate(scalar(frontmatter, 'updatedDate') ?? scalar(frontmatter, 'pubDate')),
			};
		});

	// Google wants every URL in an hreflang set to list the whole set, itself included.
	const groups = new Map();
	for (const post of posts) {
		if (!post.translationKey) continue;
		groups.set(post.translationKey, [...(groups.get(post.translationKey) ?? []), post]);
	}

	const linksFor = new Map();
	for (const group of groups.values()) {
		if (group.length < 2) continue;
		const links = group.map((post) => ({ lang: post.lang, url: post.url }));
		const fallback = group.find((post) => post.lang === 'en');
		if (fallback) links.push({ lang: 'x-default', url: fallback.url });
		for (const post of group) linksFor.set(post.pathname, links);
	}

	return new Map(
		posts.map((post) => [
			post.pathname,
			{ lastmod: post.lastmod, links: linksFor.get(post.pathname) },
		]),
	);
}
