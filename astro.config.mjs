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
			provider: fontProviders.google(),
			name: 'Source Serif 4',
			cssVariable: '--font-serif',
			weights: [400, 600, 700],
			styles: ['normal', 'italic'],
			fallbacks: ['Georgia', 'serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Inter',
			cssVariable: '--font-sans',
			weights: [400, 500, 700],
			styles: ['normal'],
			fallbacks: ['system-ui', 'sans-serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Noto Serif Thai',
			cssVariable: '--font-thai',
			weights: [400, 700],
			styles: ['normal'],
			fallbacks: ['Sarabun', 'sans-serif'],
		},
	],
});
