/**
 * Editorial month abbreviations.
 *
 * `toLocaleDateString('en-GB', { month: 'short' })` is not stable across runtimes:
 * the CLDR data shipped with newer ICU abbreviates September as "Sept" while older
 * data gives "Sep". The site rendered both — "SEPT" in article headers, built on
 * Cloudflare, and "SEP" in listings, from a hardcoded array. Fixing the abbreviations
 * here makes the date column the same width everywhere and the same on every runtime.
 */
export const MONTHS_SHORT = [
	'JAN',
	'FEB',
	'MAR',
	'APR',
	'MAY',
	'JUN',
	'JUL',
	'AUG',
	'SEP',
	'OCT',
	'NOV',
	'DEC',
] as const;

/** "23 AUG 2026" — the masthead date form, identical in every environment. */
export const editorialDate = (date: Date) =>
	`${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;

/**
 * `YYYY-MM-DD` in the local calendar. `toISOString` would render a frontmatter
 * date as the previous day when built in UTC+7; the sitemap already avoids this
 * (`scripts/blog-sitemap-entries.mjs`), and `datePublished` must match `<lastmod>`.
 */
export const isoDate = (date: Date) => {
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
};
