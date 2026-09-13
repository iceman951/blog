/**
 * Weekly DCA on equal terms. Every plan buys the same amount once per calendar
 * week; if the chosen weekday is not a trading day the order fills on the next
 * trading day, and that rule is the same for every weekday. Every plan therefore
 * has the same number of installments and the same total invested, and can only
 * differ through the prices it paid.
 */
import type { Bar } from './data.ts';

export const DAYMS = 864e5;
export const days = (d: string) => Date.parse(`${d}T12:00:00Z`);

/** Monday timestamps of every calendar week whose Friday is inside the sample. */
export const calendarWeeks = (bars: Bar[]): number[] => {
	const first = days(bars[0].date), last = days(bars[bars.length - 1].date);
	const firstMonday = first + ((8 - bars[0].weekday) % 7) * DAYMS;
	const out: number[] = [];
	for (let m = firstMonday; m + 4 * DAYMS <= last; m += 7 * DAYMS) out.push(m);
	return out;
};

/** First trading day on or after the target date, or null past the end of the sample. */
export const execute = (bars: Bar[], target: number): Bar | null => {
	let lo = 0, hi = bars.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (days(bars[mid].date) < target) lo = mid + 1; else hi = mid;
	}
	return lo < bars.length ? bars[lo] : null;
};

export interface Plan { shares: number; spent: number; shifted: number; lastClose: number; lastDate: string }

/** `day` is 1 (Monday) to 5 (Friday); `startWeek` indexes into `weeks`. */
export const plan = (bars: Bar[], weeks: number[], day: number, startWeek: number, installments: number, amount = 100): Plan => {
	let shares = 0, spent = 0, shifted = 0, lastBar: Bar | null = null;
	for (let w = startWeek; w < startWeek + installments; w++) {
		if (w >= weeks.length) throw new Error('plan runs past the sample');
		const target = weeks[w] + (day - 1) * DAYMS;
		const bar = execute(bars, target);
		if (!bar) throw new Error('plan runs past the sample');
		if (days(bar.date) !== target) shifted++;
		shares += amount / bar.close;
		spent += amount;
		lastBar = bar;
	}
	return { shares, spent, shifted, lastClose: lastBar!.close, lastDate: lastBar!.date };
};

/** Last trading day on or before the target date: the common valuation point for plans that end in the same week. */
export const valueAt = (bars: Bar[], target: number): Bar => {
	let lo = 0, hi = bars.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (days(bars[mid].date) <= target) lo = mid + 1; else hi = mid;
	}
	if (lo === 0) throw new Error('no bar on or before target');
	return bars[lo - 1];
};
