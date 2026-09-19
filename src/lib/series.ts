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

/**
 * A series exists once per language (`foo` in English, `th/foo` in Thai) but
 * posts reference it by the English id. The key strips the language prefix so
 * either entry resolves to the same set of episodes.
 */
export const seriesKey = (id: string) => id.replace(/^th\//, '');

export const postsForSeries = (
	posts: Post[],
	seriesId: string,
	lang: UiLanguage,
): SeriesPost[] => {
	const key = seriesKey(seriesId);
	const ordered = posts
		.filter(
			(post): post is SeriesPost =>
				post.data.lang === lang &&
				post.data.series !== undefined &&
				seriesKey(post.data.series.id) === key &&
				post.data.seriesOrder !== undefined,
		)
		.sort((a, b) => a.data.seriesOrder - b.data.seriesOrder);

	for (let index = 1; index < ordered.length; index++) {
		if (ordered[index - 1].data.seriesOrder === ordered[index].data.seriesOrder) {
			throw new Error(
				`Duplicate episode ${ordered[index].data.seriesOrder} in series "${key}" (${lang})`,
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

/**
 * One entry per series, in `lang` where that translation exists and in
 * English otherwise — the same rule `postsForLanguage` applies to posts.
 */
export const seriesForLanguage = (all: Series[], lang: UiLanguage): Series[] => {
	const groups = new Map<string, Series[]>();
	for (const entry of all) {
		const key = seriesKey(entry.id);
		groups.set(key, [...(groups.get(key) ?? []), entry]);
	}

	return [...groups.values()].map(
		(group) =>
			group.find((entry) => entry.data.lang === lang) ??
			group.find((entry) => entry.data.lang === 'en') ??
			group[0],
	);
};

/** The series entry matching `lang`, falling back to whatever `seriesId` names. */
export const seriesInLanguage = (all: Series[], seriesId: string, lang: UiLanguage): Series | undefined => {
	const key = seriesKey(seriesId);
	const siblings = all.filter((entry) => seriesKey(entry.id) === key);
	return siblings.find((entry) => entry.data.lang === lang) ?? siblings.find((entry) => entry.id === seriesId);
};

/** Pathnames of a series in each language it exists in, for the language switcher. */
export const seriesTranslations = (all: Series[], entry: Series): Partial<Record<UiLanguage, string>> => {
	const key = seriesKey(entry.id);
	return Object.fromEntries(
		all
			.filter((other) => seriesKey(other.id) === key)
			.map((other) => [other.data.lang, `/series/${other.id}/`]),
	) as Partial<Record<UiLanguage, string>>;
};
