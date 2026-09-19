import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { postsForLanguage } from '../lib/posts';

export async function GET(context) {
	// One entry per logical post: English when available, otherwise the only language published.
	const posts = postsForLanguage(await getCollection('blog'), 'en');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
	});
}
