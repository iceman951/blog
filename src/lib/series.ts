import type { CollectionEntry } from 'astro:content';
import type { UiLanguage } from '../i18n';
import type { Post } from './posts';

export type Series = CollectionEntry<'series'>;
export type SeriesPost = Post & {
	data: Post['data'] & {
		series: { collection: 'series'; id: string };
		seriesOrder: number;
	};
};

export const postsForSeries = (
	posts: Post[],
	seriesId: string,
	lang: UiLanguage,
): SeriesPost[] => {
	const ordered = posts
		.filter(
			(post): post is SeriesPost =>
				post.data.lang === lang &&
				post.data.series?.id === seriesId &&
				post.data.seriesOrder !== undefined,
		)
		.sort((a, b) => a.data.seriesOrder - b.data.seriesOrder);

	for (let index = 1; index < ordered.length; index++) {
		if (ordered[index - 1].data.seriesOrder === ordered[index].data.seriesOrder) {
			throw new Error(
				`Duplicate episode ${ordered[index].data.seriesOrder} in series "${seriesId}" (${lang})`,
			);
		}
	}

	return ordered;
};

export const episodeNeighbors = (posts: SeriesPost[], currentId: string) => {
	const index = posts.findIndex((post) => post.id === currentId);
	return {
		previous: index > 0 ? posts[index - 1] : undefined,
		next: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
	};
};
