// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { blogSitemapEntries } from './scripts/blog-sitemap-entries.mjs';

const SITE = 'https://blog.icerust.dev';

// Freshness and hreflang pairing for the posts; other pages pass through untouched,
// since a made-up lastmod on a static page is noise rather than a recrawl signal.
const blogEntries = blogSitemapEntries(SITE);

// https://astro.build/config
export default defineConfig({
	site: SITE,
	build: {
		// The whole site's CSS is ~5 KiB gzipped, so a separate stylesheet costs a
		// render-blocking round trip on every page and saves nothing worth caching.
		inlineStylesheets: 'always',
	},
	integrations: [
		mdx(),
		sitemap({
			serialize(item) {
				const entry = blogEntries.get(new URL(item.url).pathname);
				return entry ? { ...item, ...entry } : item;
			},
		}),
	],
	fonts: [
		{
			// Latin text and UI. 600 is the heading weight; there is no 700 on the site.
			provider: fontProviders.google(),
			name: 'Inter',
			cssVariable: '--font-sans',
			weights: [400, 500, 600],
			styles: ['normal'],
			fallbacks: ['system-ui', 'sans-serif'],
		},
		{
			// Loopless, and it has a real 600, so a mixed Thai–English heading renders
			// at one weight instead of a heavier Thai face beside lighter Latin.
			provider: fontProviders.google(),
			name: 'Noto Sans Thai',
			cssVariable: '--font-thai',
			weights: [400, 600],
			styles: ['normal'],
			// Without this the build emits only the Latin subset of a Thai family, and
			// every Thai glyph on the site falls through to a system font instead.
			subsets: ['thai', 'latin'],
			fallbacks: ['Sarabun', 'sans-serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'JetBrains Mono',
			cssVariable: '--font-mono',
			weights: [400],
			styles: ['normal'],
			fallbacks: ['ui-monospace', 'monospace'],
		},
	],
});
