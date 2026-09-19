import { describe, expect, test } from 'bun:test';
import type { Post } from './posts';
import { postsForLanguage } from './posts';
import type { Series } from './series';
import {
	episodeNeighbors,
	postsForSeries,
	seriesForLanguage,
	seriesInLanguage,
	seriesKey,
	seriesTranslations,
} from './series';

const post = (id: string, lang: 'en' | 'th', order?: number): Post =>
	({
		id,
		data: {
			title: id,
			description: id,
			pubDate: new Date('2026-01-01'),
			lang,
			...(order === undefined
				? {}
				: { series: { collection: 'series', id: 'mfe' }, seriesOrder: order }),
		},
	}) as Post;

describe('series posts', () => {
	test('filters by language, orders episodes, and finds neighbours', () => {
		const posts = postsForSeries(
			[post('th-2', 'th', 2), post('en-1', 'en', 1), post('th-1', 'th', 1), post('plain', 'th')],
			'mfe',
			'th',
		);

		expect(posts.map(({ id }) => id)).toEqual(['th-1', 'th-2']);
		expect(episodeNeighbors(posts, 'th-1')).toEqual({ previous: undefined, next: posts[1] });
		expect(episodeNeighbors(posts, 'th-2')).toEqual({ previous: posts[0], next: undefined });
	});

	test('matches episodes to the Thai series page through the shared key', () => {
		// Posts reference the English id; the Thai entry lives at `th/mfe`.
		const thai = postsForSeries([post('th-1', 'th', 1), post('en-1', 'en', 1)], 'th/mfe', 'th');
		expect(thai.map(({ id }) => id)).toEqual(['th-1']);
		expect(seriesKey('th/mfe')).toBe('mfe');
		expect(seriesKey('mfe')).toBe('mfe');
	});

	test('rejects duplicate episode numbers within one language', () => {
		expect(() => postsForSeries([post('a', 'th', 1), post('b', 'th', 1)], 'mfe', 'th')).toThrow(
			'Duplicate episode 1',
		);
	});

	test('keeps a Thai-only post in the English-preferred feed without duplicating translations', () => {
		const english = post('paired-en', 'en');
		english.data.translationKey = 'paired';
		const thai = post('paired-th', 'th');
		thai.data.translationKey = 'paired';

		const selected = postsForLanguage([post('thai-only', 'th'), thai, english], 'en');
		expect(selected.map(({ id }) => id)).toContain('thai-only');
		expect(selected.map(({ id }) => id)).toContain('paired-en');
		expect(selected.map(({ id }) => id)).not.toContain('paired-th');
	});
});

const series = (id: string, lang: 'en' | 'th', featured = false): Series =>
	({ id, data: { title: id, description: id, lang, featured } }) as Series;

describe('series translations', () => {
	const english = series('mfe', 'en', true);
	const thai = series('th/mfe', 'th', true);
	const englishOnly = series('bench', 'en');

	test('picks one entry per series in the requested language, falling back to English', () => {
		expect(seriesForLanguage([thai, english, englishOnly], 'th').map(({ id }) => id)).toEqual([
			'th/mfe',
			'bench',
		]);
		expect(seriesForLanguage([thai, english, englishOnly], 'en').map(({ id }) => id)).toEqual([
			'mfe',
			'bench',
		]);
	});

	test('resolves the sibling in a post language from the referenced id', () => {
		expect(seriesInLanguage([english, thai], 'mfe', 'th')?.id).toBe('th/mfe');
		expect(seriesInLanguage([english, thai], 'mfe', 'en')?.id).toBe('mfe');
		expect(seriesInLanguage([englishOnly], 'bench', 'th')?.id).toBe('bench');
	});

	test('lists the pathname of each language a series exists in', () => {
		expect(seriesTranslations([english, thai, englishOnly], thai)).toEqual({
			en: '/series/mfe/',
			th: '/series/th/mfe/',
		});
		expect(seriesTranslations([englishOnly], englishOnly)).toEqual({ en: '/series/bench/' });
	});
});
