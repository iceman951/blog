import type { CollectionEntry } from 'astro:content';
import type { UiLanguage } from '../i18n';

export type Post = CollectionEntry<'blog'>;

/** Posts sharing a translationKey are one logical post; those without stand alone. */
const groupKey = (post: Post) => post.data.translationKey ?? post.id;

/**
 * One entry per logical post, in `lang` where a translation exists and in
 * English otherwise — so switching to Thai never leaves holes in a listing.
 */
export const postsForLanguage = (all: Post[], lang: UiLanguage): Post[] => {
	const groups = new Map<string, Post[]>();
	for (const post of all) {
		const key = groupKey(post);
		groups.set(key, [...(groups.get(key) ?? []), post]);
	}

	return [...groups.values()]
		.map(
			(group) =>
				group.find((post) => post.data.lang === lang) ??
				group.find((post) => post.data.lang === 'en') ??
				group[0],
		)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
};
