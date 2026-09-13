import { describe, expect, test } from 'bun:test';
import { calendarWeeks, execute, plan, valueAt, days, DAYMS } from './dca.ts';
import { weekdayOf, type Bar } from './data.ts';

/** Synthetic trading calendar: every weekday from `from` for `n` weeks, minus `holidays`. */
const calendar = (from: string, weeksN: number, holidays: string[], price: (d: string) => number): Bar[] => {
	const out: Bar[] = [];
	const skip = new Set(holidays);
	for (let t = days(from); t < days(from) + weeksN * 7 * DAYMS; t += DAYMS) {
		const date = new Date(t).toISOString().slice(0, 10);
		const wd = weekdayOf(date);
		if (wd === 0 || wd === 6 || skip.has(date)) continue;
		out.push({ date, open: price(date), close: price(date), weekday: wd });
	}
	return out;
};

describe('weekly DCA rules', () => {
	// 2024-01-01 is a Monday. Two holidays: a Monday and a Friday.
	const bars = calendar('2024-01-01', 10, ['2024-01-15', '2024-02-09'], () => 50);
	const weeks = calendarWeeks(bars);

	test('weeks start on Mondays and stay inside the sample', () => {
		expect(weeks.length).toBe(10);
		for (const w of weeks) expect(new Date(w).getUTCDay()).toBe(1);
		expect(weeks[weeks.length - 1] + 4 * DAYMS).toBeLessThanOrEqual(days(bars[bars.length - 1].date));
	});

	test('every weekday invests the same amount over the same number of installments', () => {
		const plans = [1, 2, 3, 4, 5].map((d) => plan(bars, weeks, d, 0, weeks.length));
		for (const p of plans) {
			expect(p.spent).toBe(100 * weeks.length);
			// Constant price: terminal value equals what was invested, whichever day.
			expect(Math.abs(p.shares * 50 - p.spent)).toBeLessThan(1e-9);
		}
	});

	test('a holiday order fills on the next trading day, and is counted', () => {
		const mon = plan(bars, weeks, 1, 0, weeks.length), fri = plan(bars, weeks, 5, 0, weeks.length);
		expect(mon.shifted).toBe(1);
		expect(fri.shifted).toBe(1);
		expect(execute(bars, days('2024-01-15'))!.date).toBe('2024-01-16');
		expect(execute(bars, days('2024-02-09'))!.date).toBe('2024-02-12');
		expect(plan(bars, weeks, 3, 0, weeks.length).shifted).toBe(0);
	});

	test('a delayed start with a fixed horizon has the same installments as an undelayed one', () => {
		const a = plan(bars, weeks, 3, 0, 6), b = plan(bars, weeks, 3, 4, 6);
		expect(a.spent).toBe(b.spent);
		expect(b.lastDate > a.lastDate).toBe(true);
	});

	test('a plan that runs past the sample throws rather than silently shortening', () => {
		expect(() => plan(bars, weeks, 3, 8, 6)).toThrow();
	});

	test('weekday choice only matters through the prices paid', () => {
		// Price ramps 1/day: the earlier weekday pays less for the same number of shares' worth of dollars.
		const ramp = calendar('2024-01-01', 10, [], (d) => 100 + (days(d) - days('2024-01-01')) / DAYMS);
		const w = calendarWeeks(ramp);
		const mon = plan(ramp, w, 1, 0, w.length), fri = plan(ramp, w, 5, 0, w.length);
		expect(mon.spent).toBe(fri.spent);
		expect(mon.shares).toBeGreaterThan(fri.shares);
	});
});

describe('valuation date', () => {
	const bars = calendar('2024-01-01', 10, ['2024-02-09'], () => 50);
	test('is the last trading day on or before the target', () => {
		expect(valueAt(bars, days('2024-02-09')).date).toBe('2024-02-08');
		expect(valueAt(bars, days('2024-02-08')).date).toBe('2024-02-08');
		expect(valueAt(bars, days('2024-02-10')).date).toBe('2024-02-08');
	});
	test('gives every weekday plan of one start the same valuation', () => {
		const weeks = calendarWeeks(bars);
		const close = valueAt(bars, weeks[5] + 4 * DAYMS).close;
		const values = [1, 2, 3, 4, 5].map((d) => plan(bars, weeks, d, 0, 6).shares * close);
		for (const v of values) expect(Math.abs(v - values[0])).toBeLessThan(1e-9);
	});
});
