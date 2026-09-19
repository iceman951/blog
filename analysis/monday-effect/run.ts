#!/usr/bin/env bun
/**
 * Day-of-week regressions on eight high-interest US tech names, and what they
 * are worth to a weekly DCA schedule. Writes the derived statistics to
 * ../../public/analysis/monday-effect/results.json so the article can never
 * drift from the numbers.
 *
 * Exploratory analysis on a hand-picked, after-the-fact sample. Every inference
 * here is conditional on that.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { ols, pValue, waldJoint, chiSqUpper, Rng, holm, bonferroni, bootstrapP, quantile, inverse, type Matrix } from './lib.ts';
import { loadTicker, loadMarket, DAY_NAMES } from './data.ts';
import { calendarWeeks, plan, valueAt, days, DAYMS } from './dca.ts';

const TICKERS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD'];
const DAYS = [2, 3, 4, 5]; // Tue..Fri dummies; Monday is the baseline
const HALF = '2021-09-13';
const BOOT = Number(process.env.BOOT ?? 4999);
const BLOCK = Number(process.env.BLOCK ?? 10);
const SEED = 20260913;
const market = loadMarket();
const bps = (x: number) => Number((x * 10000).toFixed(2));
/** p-values keep four significant figures; the article rounds, this file does not. */
const pSig = (p: number) => Number(p.toPrecision(4));

const build = (ticker: string) => {
	const bars = loadTicker(ticker);
	const y: number[] = [], rm: number[] = [], wd: number[] = [], gap: number[] = [], date: string[] = [];
	const overnight: number[] = [], intraday: number[] = [];
	for (let i = 1; i < bars.length; i++) {
		const m1 = market.get(bars[i].date), m0 = market.get(bars[i - 1].date);
		if (!m1 || !m0) continue;
		y.push(Math.log(bars[i].close / bars[i - 1].close));
		overnight.push(Math.log(bars[i].open / bars[i - 1].close));
		intraday.push(Math.log(bars[i].close / bars[i].open));
		rm.push(Math.log(m1 / m0));
		wd.push(bars[i].weekday);
		gap.push((days(bars[i].date) - days(bars[i - 1].date)) / DAYMS);
		date.push(bars[i].date);
	}
	return { ticker, y, rm, wd, gap, date, bars, overnight, intraday };
};
type Series = ReturnType<typeof build>;
const S = TICKERS.map(build);
const N = S[0].y.length;
// The bootstrap shares one multiplier series across tickers, which only makes
// sense if every ticker's row t is the same calendar day.
for (const s of S) if (s.date.length !== N || s.date.some((d, i) => d !== S[0].date[i])) throw new Error(`${s.ticker}: dates differ`);

type Opts = { gapControl?: boolean; winsor?: number; trim?: number; from?: string; to?: string };
const design = (s: Series, idx: number[], gapControl: boolean): Matrix =>
	idx.map((i) => [1, s.rm[i], ...(gapControl ? [s.gap[i] - 1] : []), ...DAYS.map((d) => (s.wd[i] === d ? 1 : 0))]);

const fitDays = (s: Series, o: Opts = {}) => {
	let idx = s.y.map((_, i) => i);
	if (o.from) idx = idx.filter((i) => s.date[i] >= o.from!);
	if (o.to) idx = idx.filter((i) => s.date[i] < o.to!);
	if (o.trim) {
		// Drop the most extreme |return| days outright, as opposed to capping them.
		const cut = [...idx].sort((a, b) => Math.abs(s.y[b]) - Math.abs(s.y[a])).slice(0, Math.round(idx.length * o.trim));
		const drop = new Set(cut);
		idx = idx.filter((i) => !drop.has(i));
	}
	let y = idx.map((i) => s.y[i]);
	if (o.winsor) {
		const sorted = [...y].sort((a, b) => a - b);
		const lo = sorted[Math.floor(sorted.length * o.winsor)];
		const hi = sorted[Math.floor(sorted.length * (1 - o.winsor))];
		y = y.map((v) => Math.min(hi, Math.max(lo, v)));
	}
	const X = design(s, idx, !!o.gapControl);
	const fit = ols(X, y);
	const first = o.gapControl ? 3 : 2;
	const dayIdx = DAYS.map((_, j) => first + j);
	const wald = waldJoint(fit, dayIdx);
	return { fit, dayIdx, idx, X, y, n: y.length, waldStat: wald.stat, waldP: chiSqUpper(wald.stat, wald.df) };
};

const dayRow = (fit: { beta: number[]; se: number[]; t: number[] }, j: number) => ({
	bps: bps(fit.beta[j]),
	seBps: bps(fit.se[j]),
	t: Number(fit.t[j].toFixed(2)),
	p: pSig(pValue(fit.t[j])),
	ci95Bps: [bps(fit.beta[j] - 1.96 * fit.se[j]), bps(fit.beta[j] + 1.96 * fit.se[j])],
});

const results: Record<string, unknown> = {
	generated: new Date().toISOString().slice(0, 10),
	sample: { from: S[0].date[0], to: S[0].date[N - 1], observations: N, halfSplit: HALF },
	tickers: TICKERS,
	sectors: {
		'Information Technology': ['NVDA', 'AAPL', 'MSFT', 'AMD'],
		'Consumer Discretionary': ['TSLA', 'AMZN'],
		'Communication Services': ['META', 'GOOGL'],
	},
	sources: {
		prices: 'Nasdaq public historical endpoint, split-adjusted opens and closes, not dividend-adjusted',
		market: 'S&P 500 index level, FRED series SP500 (© S&P Dow Jones Indices LLC; not redistributed)',
	},
	note: 'Derived statistics only. Price and index series are not redistributed; run fetch.ts to rebuild them. Exploratory analysis on an after-the-fact sample.',
	standardErrors: `Newey-West, Bartlett kernel, ${ols(design(S[0], S[0].y.map((_, i) => i), false), S[0].y).lag} lags`,
};

// ---- Calendar span of each weekday's "one trading day", and how much of the gap
// regressor is left once the weekday dummies have had their say.
const gapByDay: Record<string, number> = {};
const gapModal: Record<string, number> = {};
for (const d of [1, 2, 3, 4, 5]) {
	const v = S[0].wd.map((w, i) => (w === d ? S[0].gap[i] : Number.NaN)).filter((x) => !Number.isNaN(x));
	gapByDay[DAY_NAMES[d]] = Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(3));
	const counts = new Map<number, number>();
	for (const g of v) counts.set(g, (counts.get(g) ?? 0) + 1);
	gapModal[DAY_NAMES[d]] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
{
	const g = S[0].gap.map((v) => v - 1);
	const Xd = S[0].wd.map((w) => [1, ...DAYS.map((d) => (w === d ? 1 : 0))]);
	const aux = ols(Xd, g, 0);
	const offModal = S[0].wd.filter((w, i) => S[0].gap[i] !== gapModal[DAY_NAMES[w]]).length;
	results.calendarSpan = {
		meanDaysByWeekday: gapByDay,
		gapRegressorR2OnWeekdayDummies: Number(aux.r2.toFixed(3)),
		observationsWithNonModalGap: offModal,
		note: 'gap − 1 is nearly a linear function of the Monday dummy; the calendar control is identified only by the holiday-shifted observations counted here.',
	};
}

// ---- Unconditional mean return per weekday, and where Monday ranks.
const meanByDay = Object.fromEntries(S.map((s) => {
	const X = s.wd.map((d) => [1, 2, 3, 4, 5].map((k) => (d === k ? 1 : 0)));
	const fit = ols(X, s.y, 0);
	return [s.ticker, Object.fromEntries([1, 2, 3, 4, 5].map((d, i) => [DAY_NAMES[d], bps(fit.beta[i])]))];
})) as Record<string, Record<string, number>>;
results.meanReturnBps = meanByDay;
results.mondayIsBestDay = TICKERS.filter((t) => Object.entries(meanByDay[t]).every(([d, v]) => d === 'Mon' || meanByDay[t].Mon > v));

// ---- Open-to-close decomposition. A Monday close-to-close return is
// Friday close → Monday open (the weekend) plus Monday open → close (the session).
results.overnightIntradayBps = Object.fromEntries(S.map((s) => {
	const X = s.wd.map((d) => [1, 2, 3, 4, 5].map((k) => (d === k ? 1 : 0)));
	const on = ols(X, s.overnight, 0), id = ols(X, s.intraday, 0);
	const Xm = s.wd.map((d) => [1, ...DAYS.map((k) => (d === k ? 1 : 0))]);
	const onFit = ols(Xm, s.overnight), idFit = ols(Xm, s.intraday);
	const onW = waldJoint(onFit, [1, 2, 3, 4]), idW = waldJoint(idFit, [1, 2, 3, 4]);
	const mean4 = (b: number[]) => bps((b[1] + b[2] + b[3] + b[4]) / 4);
	return [s.ticker, {
		overnight: Object.fromEntries([1, 2, 3, 4, 5].map((d, i) => [DAY_NAMES[d], bps(on.beta[i])])),
		intraday: Object.fromEntries([1, 2, 3, 4, 5].map((d, i) => [DAY_NAMES[d], bps(id.beta[i])])),
		tueToFriMean: { overnight: mean4(on.beta), intraday: mean4(id.beta) },
		mondayRank: { overnight: 1 + on.beta.filter((v, i) => i > 0 && v > on.beta[0]).length, intraday: 1 + id.beta.filter((v, i) => i > 0 && v > id.beta[0]).length },
		waldPWeekdayOvernight: pSig(chiSqUpper(onW.stat, 4)),
		waldPWeekdayIntraday: pSig(chiSqUpper(idW.stat, 4)),
	}];
})) as Record<string, { mondayRank: { overnight: number; intraday: number } }>;
results.mondayRankCounts = {
	intradayHighestOfFive: TICKERS.filter((t) => (results.overnightIntradayBps as any)[t].mondayRank.intraday === 1),
	overnightLowestOfFive: TICKERS.filter((t) => (results.overnightIntradayBps as any)[t].mondayRank.overnight === 5),
};

// ---- The regressions.
const spec = (o: Opts) => Object.fromEntries(S.map((s) => {
	const { fit, dayIdx, n, waldStat, waldP } = fitDays(s, o);
	return [s.ticker, {
		n, lag: fit.lag,
		waldStat: Number(waldStat.toFixed(2)), waldP: pSig(waldP),
		beta: Number(fit.beta[1].toFixed(3)),
		r2: Number((fit.r2 * 100).toFixed(1)),
		...(o.gapControl ? { gapBpsPerDay: bps(fit.beta[2]), gapT: Number(fit.t[2].toFixed(2)) } : {}),
		days: Object.fromEntries(dayIdx.map((j, i) => [`${DAY_NAMES[DAYS[i]]}-Mon`, dayRow(fit, j)])),
	}];
})) as Record<string, { waldP: number; days: Record<string, ReturnType<typeof dayRow>> }>;

const specs = {
	base: spec({}),
	calendarControlled: spec({ gapControl: true }),
	winsorized1pct: spec({ winsor: 0.01 }),
	trimmed1pct: spec({ trim: 0.01 }),
	firstHalf: spec({ to: HALF }),
	secondHalf: spec({ from: HALF }),
};
results.specifications = specs;

// ---- Multiple comparisons the classical way. Bonferroni and Holm hold under any
// dependence; positive dependence makes them conservative, not invalid.
const family = (sp: typeof specs.base) => {
	const cells = TICKERS.flatMap((t) => Object.entries(sp[t].days).map(([d, v]) => ({ t, d, p: v.p, tstat: v.t })));
	const ps = cells.map((c) => c.p);
	const bonf = bonferroni(ps, 0.05), hol = holm(ps, 0.05);
	return {
		tests: cells.length,
		under005: cells.filter((c) => c.p < 0.05).map((c) => `${c.t} ${c.d}`),
		bonferroniThreshold: pSig(0.05 / cells.length),
		bonferroniRejects: cells.filter((_, i) => bonf[i]).map((c) => `${c.t} ${c.d}`),
		holmRejects: cells.filter((_, i) => hol[i]).map((c) => `${c.t} ${c.d}`),
		maxAbsT: { value: Math.max(...cells.map((c) => Math.abs(c.tstat))), at: cells.reduce((a, b) => (Math.abs(b.tstat) > Math.abs(a.tstat) ? b : a)) },
	};
};
results.multipleComparisons = { base: family(specs.base), calendarControlled: family(specs.calendarControlled) };

// Base → calendar-controlled: how many day coefficients change sign.
const flips = TICKERS.flatMap((t) => Object.keys(specs.base[t].days).filter((d) => Math.sign(specs.base[t].days[d].bps) !== Math.sign(specs.calendarControlled[t].days[d].bps)).map((d) => `${t} ${d}`));
results.signFlipsBaseToCalendar = { count: flips.length, of: 32, which: flips };

// ---- Family-wise inference by dependent wild bootstrap.
//
// Under the null the day dummies do nothing, so y* = fitted(restricted) + e(restricted) · w.
// The multiplier w is one standard normal per block of BLOCK consecutive trading days,
// and the SAME series is applied to every ticker. Residuals stay in their calendar
// slots, so heteroskedasticity, volatility clustering and same-day cross-sectional
// correlation are preserved; serial dependence is preserved within blocks and broken
// at block edges. The statistic is max |t| over the 32 day coefficients, HAC t-stats,
// exactly what the table reports. This is not a permutation test: it relies on the
// restricted model's residuals being the right noise, and on multiplicative
// Gaussian noise being a fair stand-in for resampling them.
const bootstrap = (gapControl: boolean, B: number, block: number, seed: number) => {
	const rng = new Rng(seed);
	const prep = S.map((s) => {
		const idx = s.y.map((_, i) => i);
		const X = design(s, idx, gapControl);
		const XtXinv = inverse(X[0].map((_, a) => X[0].map((_, b) => X.reduce((acc, row) => acc + row[a] * row[b], 0))));
		const Xr = idx.map((i) => [1, s.rm[i], ...(gapControl ? [s.gap[i] - 1] : [])]);
		const restricted = ols(Xr, s.y, 0);
		const full = ols(X, s.y, undefined, XtXinv);
		const first = gapControl ? 3 : 2;
		const dayIdx = DAYS.map((_, j) => first + j);
		return { X, XtXinv, fitted: restricted.fitted, resid: restricted.resid, dayIdx, observedMaxT: Math.max(...dayIdx.map((j) => Math.abs(full.t[j]))), observedWald: waldJoint(full, dayIdx).stat };
	});
	const observed = Math.max(...prep.map((p) => p.observedMaxT));
	const maxima: number[] = [];
	const waldDraws: number[][] = S.map(() => []);
	const w = new Float64Array(N);
	for (let b = 0; b < B; b++) {
		for (let t = 0; t < N; t += block) {
			const z = rng.normal();
			for (let u = t; u < Math.min(N, t + block); u++) w[u] = z;
		}
		let mx = 0;
		prep.forEach((p, si) => {
			const ystar = p.fitted.map((f, i) => f + p.resid[i] * w[i]);
			const fit = ols(p.X, ystar, undefined, p.XtXinv);
			for (const j of p.dayIdx) mx = Math.max(mx, Math.abs(fit.t[j]));
			waldDraws[si].push(waldJoint(fit, p.dayIdx).stat);
		});
		maxima.push(mx);
	}
	maxima.sort((a, b) => a - b);
	const fam = bootstrapP(observed, maxima);
	return {
		method: `dependent wild bootstrap, block length ${block} trading days, Gaussian multipliers shared across tickers, HAC t-statistics`,
		draws: B, seed, block,
		statistic: 'max |t| over 8 tickers x 4 day dummies',
		observed: Number(observed.toFixed(2)),
		null: { median: Number(quantile(maxima, 0.5).toFixed(2)), p95: Number(quantile(maxima, 0.95).toFixed(2)), p99: Number(quantile(maxima, 0.99).toFixed(2)) },
		familyWiseP: pSig(fam.p), exceedances: fam.exceed,
		monteCarloSe: pSig(fam.mcSe), resolution: pSig(fam.resolution),
		perTickerWaldP: Object.fromEntries(S.map((s, si) => {
			const d = [...waldDraws[si]].sort((a, b) => a - b);
			return [s.ticker, pSig(bootstrapP(prep[si].observedWald, d).p)];
		})),
	};
};
const t0 = Date.now();
results.bootstrap = {
	base: bootstrap(false, BOOT, BLOCK, SEED),
	calendarControlled: bootstrap(true, BOOT, BLOCK, SEED + 1),
	blockSensitivity: Object.fromEntries([1, 5, 20].map((bl) => {
		const r = bootstrap(false, Math.min(BOOT, 1999), bl, SEED + 10 + bl);
		return [`block${bl}`, { familyWiseP: r.familyWiseP, monteCarloSe: r.monteCarloSe, draws: r.draws, p95: r.null.p95 }];
	})),
};
console.error(`bootstrap: ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// ---- Are the two halves different? Test the difference directly, in one pooled
// regression with a second-half indicator interacted with everything.
results.halvesInteraction = Object.fromEntries(S.map((s) => {
	const H = s.date.map((d) => (d >= HALF ? 1 : 0));
	const X = s.y.map((_, i) => {
		const base = [1, s.rm[i], ...DAYS.map((d) => (s.wd[i] === d ? 1 : 0))];
		return [...base, ...base.map((v) => v * H[i])];
	});
	const fit = ols(X, s.y);
	const inter = [8, 9, 10, 11];
	const w = waldJoint(fit, inter);
	return [s.ticker, {
		waldPDifference: pSig(chiSqUpper(w.stat, 4)),
		differenceSecondMinusFirst: Object.fromEntries(inter.map((j, i) => [`${DAY_NAMES[DAYS[i]]}-Mon`, dayRow(fit, j)])),
	}];
}));

// ---- Influence: does the largest single result rest on a handful of days?
// Leave-one-out over every trading day for that coefficient, then refit without
// the ten days that moved it most.
{
	const top = results.multipleComparisons as { base: { maxAbsT: { at: { t: string; d: string } } } };
	const ticker = top.base.maxAbsT.at.t, dayLabel = top.base.maxAbsT.at.d;
	const s = S.find((x) => x.ticker === ticker)!;
	const j = 2 + DAYS.findIndex((d) => DAY_NAMES[d] === dayLabel.split('-')[0]);
	const all = fitDays(s);
	const tFull = all.fit.t[j];
	const deltas = s.y.map((_, drop) => {
		const idx = all.idx.filter((i) => i !== drop);
		const fit = ols(design(s, idx, false), idx.map((i) => s.y[i]));
		return { drop, dt: fit.t[j] - tFull, date: s.date[drop], ret: bps(s.y[drop]) };
	}).sort((a, b) => Math.abs(b.dt) - Math.abs(a.dt));
	const without = (k: number) => {
		const gone = new Set(deltas.slice(0, k).map((d) => d.drop));
		const idx = all.idx.filter((i) => !gone.has(i));
		const fit = ols(design(s, idx, false), idx.map((i) => s.y[i]));
		return { bps: bps(fit.beta[j]), t: Number(fit.t[j].toFixed(2)) };
	};
	results.influence = {
		coefficient: `${ticker} ${dayLabel}`,
		full: { bps: bps(all.fit.beta[j]), t: Number(tFull.toFixed(2)) },
		largestSingleDayShiftInT: Number(deltas[0].dt.toFixed(2)),
		mostInfluentialDays: deltas.slice(0, 5).map((d) => ({ date: d.date, returnBps: d.ret, deltaT: Number(d.dt.toFixed(2)) })),
		withoutTop5: without(5),
		withoutTop10: without(10),
		withoutTop25: without(25),
	};
}

// ---- Weekly DCA, on equal terms; see dca.ts for the rules.
const weeks = calendarWeeks(S[0].bars);
const STARTS = 52;
const HORIZON = weeks.length - STARTS;
results.dca = {
	design: {
		amountPerWeek: 100,
		calendarWeeks: weeks.length,
		weekdayExperiment: `all ${weeks.length} weeks, one plan per weekday, valued at the same final close`,
		startExperiment: `${HORIZON} installments, start delayed by 0..${STARTS - 1} weeks; the five weekday plans of one start are valued at the same close, the last trading day of their final week`,
		holidayRule: 'order fills on the next trading day',
	},
	byTicker: Object.fromEntries(S.map((s) => {
		const last = s.bars[s.bars.length - 1].close;
		const full = [1, 2, 3, 4, 5].map((d) => plan(s.bars, weeks, d, 0, weeks.length));
		const spent = full[0].spent;
		if (full.some((p) => p.spent !== spent)) throw new Error('unequal investment');
		const terminal = full.map((p) => p.shares * last);
		const ret = terminal.map((v) => v / spent - 1);
		// Start sensitivity at a fixed horizon; the grid also gives the weekday spread at every start.
		const grid = Array.from({ length: STARTS }, (_, k) => {
			const close = valueAt(s.bars, weeks[k + HORIZON - 1] + 4 * DAYMS).close;
			return [1, 2, 3, 4, 5].map((d) => {
				const p = plan(s.bars, weeks, d, k, HORIZON);
				return (p.shares * close) / p.spent - 1;
			});
		});
		const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
		const weekdaySpreadAtEachStart = grid.map(spread).sort((a, b) => a - b);
		const startSpreadByDay = [0, 1, 2, 3, 4].map((di) => spread(grid.map((row) => row[di])));
		return [s.ticker, {
			invested: spent,
			installments: weeks.length,
			holidayShiftedOrders: Object.fromEntries(full.map((p, i) => [DAY_NAMES[i + 1], p.shifted])),
			terminalValue: Object.fromEntries(terminal.map((v, i) => [DAY_NAMES[i + 1], Number(v.toFixed(0))])),
			totalReturnPct: Object.fromEntries(ret.map((v, i) => [DAY_NAMES[i + 1], Number((v * 100).toFixed(1))])),
			weekdaySpread: {
				points: Number((spread(ret) * 100).toFixed(1)),
				dollars: Number(spread(terminal).toFixed(0)),
				relativePct: Number(((Math.max(...terminal) / Math.min(...terminal) - 1) * 100).toFixed(2)),
				bestDay: DAY_NAMES[ret.indexOf(Math.max(...ret)) + 1],
				worstDay: DAY_NAMES[ret.indexOf(Math.min(...ret)) + 1],
			},
			fixedHorizon: {
				installments: HORIZON,
				weekdaySpreadPoints: { median: Number((quantile(weekdaySpreadAtEachStart, 0.5) * 100).toFixed(1)), max: Number((weekdaySpreadAtEachStart[STARTS - 1] * 100).toFixed(1)) },
				startSpreadPoints: Object.fromEntries(startSpreadByDay.map((v, i) => [DAY_NAMES[i + 1], Number((v * 100).toFixed(1))])),
				startSpreadOverWeekdaySpread: Number((startSpreadByDay[2] / quantile(weekdaySpreadAtEachStart, 0.5)).toFixed(1)),
				returnRangeWed: [Number((Math.min(...grid.map((r) => r[2])) * 100).toFixed(1)), Number((Math.max(...grid.map((r) => r[2])) * 100).toFixed(1))],
			},
		}];
	})),
};

const outDir = '../../public/analysis/monday-effect';
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 2) + '\n');

// ---- Console summary.
const R = results as any;
console.log(JSON.stringify({ sample: R.sample, calendarSpan: R.calendarSpan, mondayIsBestDay: R.mondayIsBestDay, signFlips: R.signFlipsBaseToCalendar.count, multipleComparisons: R.multipleComparisons.base, bootstrap: { base: R.bootstrap.base, calendar: R.bootstrap.calendarControlled.familyWiseP, blocks: R.bootstrap.blockSensitivity }, influence: R.influence }, null, 2));
console.log('\nWald p by specification:');
const cols = Object.keys(specs);
console.log(`  ${'ticker'.padEnd(6)} ${cols.map((c) => c.slice(0, 10).padStart(10)).join(' ')}  halvesDiff`);
for (const t of TICKERS) {
	const row = cols.map((k) => (specs as any)[k][t].waldP.toFixed(3).padStart(10));
	console.log(`  ${t.padEnd(6)} ${row.join(' ')}  ${R.halvesInteraction[t].waldPDifference.toFixed(3)}`);
}
console.log('\nDCA: weekday spread (points, $) vs start-week spread at fixed horizon (Wed, points)');
for (const t of TICKERS) {
	const d = R.dca.byTicker[t];
	console.log(`  ${t.padEnd(6)} ${String(d.weekdaySpread.points).padStart(6)} $${String(d.weekdaySpread.dollars).padStart(6)}  ${String(d.fixedHorizon.startSpreadPoints.Wed).padStart(7)}  x${d.fixedHorizon.startSpreadOverWeekdaySpread}`);
}
