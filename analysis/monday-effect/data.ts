/** Loads the local snapshots. Prices are split-adjusted; dividends are not reflected. */
export interface Bar { date: string; close: number; weekday: number }

const num = (s: string) => Number(s.replace(/[$,]/g, ''));
const iso = (mdy: string) => {
	const [m, d, y] = mdy.split('/');
	return `${y}-${m}-${d}`;
};
/** UTC noon keeps the weekday stable regardless of the machine's timezone. */
export const weekdayOf = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`).getUTCDay();

export const loadTicker = (t: string): Bar[] => {
	const raw = JSON.parse(require('node:fs').readFileSync(`data/raw_${t}.json`, 'utf8'));
	const rows = raw.data.tradesTable.rows as { date: string; close: string }[];
	return rows
		.map((r) => {
			const date = iso(r.date);
			return { date, close: num(r.close), weekday: weekdayOf(date) };
		})
		.filter((b) => Number.isFinite(b.close) && b.close > 0)
		.sort((a, b) => a.date.localeCompare(b.date));
};

export const loadMarket = (): Map<string, number> => {
	const text = require('node:fs').readFileSync('data/sp500.csv', 'utf8') as string;
	const out = new Map<string, number>();
	for (const line of text.trim().split('\n').slice(1)) {
		const [d, v] = line.split(',');
		if (v && v !== '.') out.set(d, Number(v));
	}
	return out;
};

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
