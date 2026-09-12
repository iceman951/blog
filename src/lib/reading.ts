/**
 * Reading time for mixed Thai/English bodies.
 *
 * Counting whitespace-delimited words is wrong for Thai, which writes without
 * spaces between words: a 6,000-character Thai article would score a handful of
 * "words". So Thai characters are counted separately and converted at a Thai
 * reading rate, and the two estimates are added.
 */
const WORDS_PER_MINUTE = 220;
const THAI_CHARS_PER_MINUTE = 700;

export const readingMinutes = (body: string | undefined): number => {
	if (!body) return 0;

	// Strip the parts a reader does not read word by word.
	const prose = body
		.replace(/^---[\s\S]*?---/, '')
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');

	const thaiChars = (prose.match(/[฀-๿]/g) ?? []).length;
	const latinWords = prose
		.replace(/[฀-๿]+/g, ' ')
		.split(/\s+/)
		.filter(Boolean).length;

	const minutes = latinWords / WORDS_PER_MINUTE + thaiChars / THAI_CHARS_PER_MINUTE;
	return Math.max(1, Math.round(minutes));
};
