// UI strings that appear outside post bodies (layout chrome and chart labels).
// Post prose lives in the content collection, one file per language.
export type UiLanguage = 'en' | 'th';

export const ui = {
	en: {
		lastUpdated: 'Last updated on',
		dateLocale: 'en-us',
		readingList: 'Blog',
		latestPosts: 'Latest posts',
		series: 'Series',
		featuredSeries: 'Featured series',
		viewSeries: 'View series',
		episode: 'Episode',
		previousEpisode: 'Previous episode',
		nextEpisode: 'Next episode',
	},
	th: {
		lastUpdated: 'อัปเดตล่าสุดเมื่อ',
		dateLocale: 'th-TH-u-ca-gregory', // Gregorian, not Buddhist era — a 2569 would confuse a tech post
		readingList: 'บล็อก',
		latestPosts: 'บทความล่าสุด',
		series: 'ซีรีส์',
		featuredSeries: 'ซีรีส์แนะนำ',
		viewSeries: 'อ่านซีรีส์นี้',
		episode: 'ตอน',
		previousEpisode: 'ตอนก่อนหน้า',
		nextEpisode: 'ตอนถัดไป',
	},
} as const satisfies Record<UiLanguage, Record<string, string>>;

export const t = <K extends keyof (typeof ui)['en']>(lang: UiLanguage, key: K) => ui[lang][key];

/** Locale tag for `toLocaleDateString`. */
export const dateLocale = (lang: UiLanguage) => ui[lang].dateLocale;
