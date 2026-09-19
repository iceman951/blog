import { describe, expect, test } from 'bun:test';
import type { Post } from './posts';
import { postsForLanguage } from './posts';
import { episodeNeighbors, postsForSeries } from './series';

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
