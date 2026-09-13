#!/usr/bin/env bun
/**
 * Day-of-week regressions on eight high-interest US tech names, and what they
 * are worth to a weekly DCA schedule. Writes the derived statistics to
 * ../../public/analysis/monday-effect/results.json so the article can never
 * drift from the numbers.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { ols, pValue, waldJoint, chiSqUpper } from './lib.ts';
import { loadTicker, loadMarket, DAY_NAMES } from './data.ts';

const TICKERS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD'];
const DAYMS = 864e5;
const market = loadMarket();
const bps = (x: number) => Number((x * 10000).toFixed(2));

const build = (ticker: string) => {
	const bars = loadTicker(ticker);
	const y: number[] = [], rm: number[] = [], wd: number[] = [], gap: number[] = [], date: string[] = [];
	for (let i = 1; i < bars.length; i++) {
		const m1 = market.get(bars[i].date), m0 = market.get(bars[i - 1].date);
		if (!m1 || !m0) continue;
		y.push(Math.log(bars[i].close / bars[i - 1].close));
		rm.push(Math.log(m1 / m0));
		wd.push(bars[i].weekday);
		gap.push((Date.parse(`${bars[i].date}T12:00:00Z`) - Date.parse(`${bars[i - 1].date}T12:00:00Z`)) / DAYMS);
		date.push(bars[i].date);
	}
	return { ticker, y, rm, wd, gap, date, bars };
};
const S = TICKERS.map(build);

type Opts = { gapControl?: boolean; winsor?: number; from?: string; to?: string };
const fitDays = (s: ReturnType<typeof build>, o: Opts = {}) => {
	let idx = s.y.map((_, i) => i);
	if (o.from) idx = idx.filter((i) => s.date[i] >= o.from!);
	if (o.to) idx = idx.filter((i) => s.date[i] < o.to!);
	let y = idx.map((i) => s.y[i]);
	if (o.winsor) {
		const sorted = [...y].sort((a, b) => a - b);
		const lo = sorted[Math.floor(sorted.length * o.winsor)];
		const hi = sorted[Math.floor(sorted.length * (1 - o.winsor))];
		y = y.map((v) => Math.min(hi, Math.max(lo, v)));
	}
	const X = idx.map((i) => [
		1, s.rm[i],
		...(o.gapControl ? [s.gap[i] - 1] : []),
		...[2, 3, 4, 5].map((d) => (s.wd[i] === d ? 1 : 0)),
	]);
	const fit = ols(X, y);
	const first = o.gapControl ? 3 : 2;
	const dayIdx = [first, first + 1, first + 2, first + 3];
	const wald = waldJoint(fit, dayIdx);
	return { fit, dayIdx, n: y.length, waldP: chiSqUpper(wald.stat, wald.df), waldStat: wald.stat };
};

const results: Record<string, unknown> = {
	generated: new Date().toISOString().slice(0, 10),
	sample: { from: S[0].date[0], to: S[0].date[S[0].date.length - 1], observations: S[0].y.length },
	tickers: TICKERS,
	sources: {
		prices: 'Nasdaq public historical endpoint, split-adjusted closes, not dividend-adjusted',
		market: 'S&P 500 index level, FRED series SP500',
	},
	note: 'Derived statistics only. Price series are not redistributed; run fetch.ts to rebuild them.',
};

// Calendar span of each weekday's "one trading day".
const gapByDay: Record<string, number> = {};
for (const d of [1, 2, 3, 4, 5]) {
	const v = S[0].wd.map((w, i) => (w === d ? S[0].gap[i] : NaN)).filter((x) => !Number.isNaN(x));
	gapByDay[DAY_NAMES[d]] = Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(3));
}
results.calendarSpanDays = gapByDay;

// Unconditional mean return per weekday.
results.meanReturnBps = Object.fromEntries(S.map((s) => {
	const X = s.wd.map((d) => [1, 2, 3, 4, 5].map((k) => (d === k ? 1 : 0)));
	const fit = ols(X, s.y);
	return [s.ticker, Object.fromEntries([1, 2, 3, 4, 5].map((d, i) => [DAY_NAMES[d], bps(fit.beta[i])]))];
}));

const spec = (label: string, o: Opts) => Object.fromEntries(S.map((s) => {
	const { fit, dayIdx, n, waldP } = fitDays(s, o);
	return [s.ticker, {
		n, waldP: Number(waldP.toFixed(4)),
		beta: Number(fit.beta[1].toFixed(3)),
		r2: Number((fit.r2 * 100).toFixed(1)),
		days: Object.fromEntries(dayIdx.map((j, i) => [
			`${DAY_NAMES[i + 2]}-Mon`,
			{ bps: bps(fit.beta[j]), t: Number(fit.t[j].toFixed(2)), p: Number(pValue(fit.t[j]).toFixed(4)) },
		])),
	}];
}));

results.specifications = {
	base: spec('base', {}),
	calendarControlled: spec('calendar', { gapControl: true }),
	winsorized1pct: spec('winsor', { winsor: 0.01 }),
	firstHalf: spec('first', { to: '2021-09-13' }),
	secondHalf: spec('second', { from: '2021-09-13' }),
};

// Permutation test: one shuffled calendar applied to every ticker, so the
// cross-sectional correlation that makes Bonferroni wrong here is preserved.
const observed = S.flatMap((s) => {
	const { fit, dayIdx } = fitDays(s);
	return dayIdx.map((j) => Math.abs(fit.beta[j] / fit.seOls[j]));
});
const maxObserved = Math.max(...observed);
const PERMS = 2000;
let seed = 424242;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const maxima: number[] = [];
for (let p = 0; p < PERMS; p++) {
	const shuffled = [...S[0].wd];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	let mx = 0;
	for (const s of S) {
		const wd = shuffled.slice(0, s.wd.length);
		const X = s.wd.map((_, i) => [1, s.rm[i], ...[2, 3, 4, 5].map((d) => (wd[i] === d ? 1 : 0))]);
		const fit = ols(X, s.y, 0);
		for (const j of [2, 3, 4, 5]) mx = Math.max(mx, Math.abs(fit.beta[j] / fit.seOls[j]));
	}
	maxima.push(mx);
}
maxima.sort((a, b) => a - b);
const worse = maxima.filter((m) => m >= maxObserved).length;
results.permutation = {
	permutations: PERMS,
	statistic: 'max |t| over 8 tickers x 4 day dummies, classical standard errors',
	observed: Number(maxObserved.toFixed(2)),
	null: {
		median: Number(maxima[PERMS >> 1].toFixed(2)),
		p95: Number(maxima[Math.floor(PERMS * 0.95)].toFixed(2)),
		p99: Number(maxima[Math.floor(PERMS * 0.99)].toFixed(2)),
	},
	familyWiseP: Number(((worse + 1) / (PERMS + 1)).toFixed(4)),
};

// Weekly DCA: which weekday, against merely starting in a different week.
const simulate = (bars: { date: string; close: number; weekday: number }[], day: number, skip: number) => {
	let shares = 0, spent = 0, week = -1;
	const seen = new Set<string>();
	for (const b of bars) {
		if (b.weekday !== day) continue;
		week++;
		if (week < skip) continue;
		const k = `${b.date.slice(0, 7)}-${Math.floor(Number(b.date.slice(8, 10)) / 7)}`;
		if (seen.has(k)) continue;
		seen.add(k);
		shares += 100 / b.close;
		spent += 100;
	}
	return { shares, spent };
};
results.dca = Object.fromEntries(S.map((s) => {
	const last = s.bars[s.bars.length - 1].close;
	const byDay = [1, 2, 3, 4, 5].map((d) => {
		const { shares, spent } = simulate(s.bars, d, 0);
		return (shares * last) / spent - 1;
	});
	const byStart = Array.from({ length: 52 }, (_, k) => {
		const { shares, spent } = simulate(s.bars, 3, k);
		return (shares * last) / spent - 1;
	});
	const dayRange = Math.max(...byDay) - Math.min(...byDay);
	const startRange = Math.max(...byStart) - Math.min(...byStart);
	return [s.ticker, {
		byWeekdayPct: Object.fromEntries([1, 2, 3, 4, 5].map((d, i) => [DAY_NAMES[d], Number((byDay[i] * 100).toFixed(1))])),
		weekdaySpreadPoints: Number((dayRange * 100).toFixed(1)),
		startWeekSpreadPoints: Number((startRange * 100).toFixed(1)),
		ratio: Number((startRange / dayRange).toFixed(1)),
	}];
}));

mkdirSync('../../public/analysis/monday-effect', { recursive: true });
writeFileSync('../../public/analysis/monday-effect/results.json', JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({
	sample: results.sample,
	calendarSpanDays: results.calendarSpanDays,
	permutation: results.permutation,
}, null, 2));
console.log('\nWald p by specification:');
for (const t of TICKERS) {
	const row = ['base', 'calendarControlled', 'winsorized1pct', 'firstHalf', 'secondHalf']
		.map((k) => ((results.specifications as never)[k][t].waldP as number).toFixed(3).padStart(6));
	console.log(`  ${t.padEnd(6)} ${row.join(' ')}`);
}
console.log('\nDCA spread (points): weekday choice vs start week');
for (const t of TICKERS) {
	const d = (results.dca as never)[t];
	console.log(`  ${t.padEnd(6)} ${String(d.weekdaySpreadPoints).padStart(6)} ${String(d.startWeekSpreadPoints).padStart(8)}  ${d.ratio}x`);
}
