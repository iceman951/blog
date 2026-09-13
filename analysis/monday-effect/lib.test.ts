import { describe, expect, test } from 'bun:test';
import {
	ols, inverse, hacMeat, sandwich, waldJoint, erfc, normalUpper, pValue, chiSqUpper, chiSqUpperWH,
	gammaQ, lnGamma, Rng, holm, bonferroni, bootstrapP, bandwidth,
} from './lib.ts';

const close = (a: number, b: number, tol = 1e-12) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('OLS', () => {
	test('recovers the coefficients of an exact linear relation', () => {
		const X = Array.from({ length: 50 }, (_, i) => [1, i, (i * 7) % 11]);
		const y = X.map((r) => 2 + 0.5 * r[1] - 3 * r[2]);
		const f = ols(X, y, 0);
		close(f.beta[0], 2, 1e-9); close(f.beta[1], 0.5, 1e-9); close(f.beta[2], -3, 1e-9);
		close(f.r2, 1, 1e-12);
	});
	test('matches the closed-form simple regression', () => {
		const x = [1, 2, 3, 4, 5, 6, 7, 8], y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1];
		const xb = x.reduce((a, b) => a + b) / x.length, yb = y.reduce((a, b) => a + b) / y.length;
		const sxy = x.reduce((s, v, i) => s + (v - xb) * (y[i] - yb), 0), sxx = x.reduce((s, v) => s + (v - xb) ** 2, 0);
		const f = ols(x.map((v) => [1, v]), y, 0);
		close(f.beta[1], sxy / sxx); close(f.beta[0], yb - (sxy / sxx) * xb);
		// Classical SE of the slope: sqrt(s2 / sxx).
		const s2 = f.resid.reduce((s, e) => s + e * e, 0) / (x.length - 2);
		close(f.seOls[1], Math.sqrt(s2 / sxx));
	});
	test('inverse really inverts', () => {
		const A = [[4, 1, 2], [1, 3, 0], [2, 0, 5]];
		const I = inverse(A).map((row) => A[0].map((_, j) => row.reduce((s, v, k) => s + v * A[k][j], 0)));
		I.forEach((row, i) => row.forEach((v, j) => close(v, i === j ? 1 : 0)));
	});
	test('a precomputed (X\'X)^-1 gives the same fit', () => {
		const rng = new Rng(3);
		const X = Array.from({ length: 200 }, () => [1, rng.normal(), rng.uniform() > 0.5 ? 1 : 0]);
		const y = X.map((r) => r[1] + 0.3 * r[2] + rng.normal());
		const XtX = X[0].map((_, a) => X[0].map((_, b) => X.reduce((s, r) => s + r[a] * r[b], 0)));
		const f1 = ols(X, y), f2 = ols(X, y, undefined, inverse(XtX));
		f1.beta.forEach((b, i) => close(b, f2.beta[i], 1e-10));
		f1.se.forEach((b, i) => close(b, f2.se[i], 1e-10));
	});
});

describe('Newey-West', () => {
	// An independent, literal implementation of the textbook formula to check the fast one against.
	const naiveHac = (X: number[][], e: number[], L: number) => {
		const k = X[0].length, n = e.length;
		const S = Array.from({ length: k }, () => Array(k).fill(0));
		for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
			for (let t = 0; t < n; t++) S[a][b] += e[t] * e[t] * X[t][a] * X[t][b];
			for (let l = 1; l <= L; l++) {
				const w = 1 - l / (L + 1);
				for (let t = l; t < n; t++) S[a][b] += w * e[t] * e[t - l] * (X[t][a] * X[t - l][b] + X[t - l][a] * X[t][b]);
			}
		}
		return S;
	};
	test('the meat matrix matches a literal implementation', () => {
		const rng = new Rng(11);
		const X = Array.from({ length: 300 }, () => [1, rng.normal(), rng.uniform()]);
		const e = Array.from({ length: 300 }, () => rng.normal());
		const A = hacMeat(X, e, 6), B = naiveHac(X, e, 6);
		A.forEach((row, i) => row.forEach((v, j) => close(v, B[i][j], 1e-9)));
	});
	test('lag 0 reduces to White HC0', () => {
		const rng = new Rng(5);
		const X = Array.from({ length: 300 }, () => [1, rng.normal()]);
		const y = X.map((r) => r[1] + rng.normal() * (1 + Math.abs(r[1])));
		const f = ols(X, y, 0);
		const XtX = inverse(X[0].map((_, a) => X[0].map((_, b) => X.reduce((s, r) => s + r[a] * r[b], 0))));
		const meat = X[0].map((_, a) => X[0].map((_, b) => X.reduce((s, r, t) => s + f.resid[t] ** 2 * r[a] * r[b], 0)));
		const V = sandwich(XtX, meat);
		close(f.se[1], Math.sqrt(V[1][1]), 1e-12);
	});
	test('bandwidth rule gives 8 lags at n = 2512', () => {
		expect(bandwidth(2512)).toBe(8);
	});
	test('HAC covariance is symmetric and positive on the diagonal', () => {
		const rng = new Rng(7);
		const X = Array.from({ length: 400 }, () => [1, rng.normal(), rng.normal()]);
		let e = 0;
		const y = X.map((r) => { e = 0.6 * e + rng.normal(); return r[1] + e; });
		const f = ols(X, y);
		f.vcov.forEach((row, i) => row.forEach((v, j) => close(v, f.vcov[j][i], 1e-12)));
		f.se.forEach((s) => expect(s).toBeGreaterThan(0));
	});
	test('Wald statistic on one coefficient equals t squared', () => {
		const rng = new Rng(9);
		const X = Array.from({ length: 200 }, () => [1, rng.normal()]);
		const y = X.map((r) => 0.2 * r[1] + rng.normal());
		const f = ols(X, y);
		close(waldJoint(f, [1]).stat, f.t[1] ** 2, 1e-9);
	});
});

describe('tail probabilities', () => {
	test('erfc against reference values', () => {
		close(erfc(0), 1); close(erfc(0.5), 0.4795001221869535, 1e-14);
		close(erfc(2), 0.004677734981047266, 1e-15); close(erfc(3), 2.209049699858544e-5, 1e-17);
		close(erfc(5), 1.5374597944280349e-12, 1e-24); close(erfc(-1), 2 - erfc(1));
	});
	test('normal tail against reference values', () => {
		close(normalUpper(1.959963984540054), 0.025, 1e-14);
		close(normalUpper(3), 0.0013498980316301035, 1e-16);
		close(pValue(-1.96), 2 * normalUpper(1.96));
	});
	test('chi-square upper tail is exact for df = 2 and df = 4', () => {
		for (const x of [0.1, 1.02, 5, 17.6, 40]) {
			close(chiSqUpper(x, 2), Math.exp(-x / 2), 1e-14);
			close(chiSqUpper(x, 4), Math.exp(-x / 2) * (1 + x / 2), 1e-14);
			close(chiSqUpper(x, 1), erfc(Math.sqrt(x / 2)), 1e-14);
		}
		expect(chiSqUpper(0, 4)).toBe(1);
	});
	test('the old approximation was off in the fourth decimal and the tail', () => {
		// Wilson–Hilferty is what the first version of the article used.
		const exact = chiSqUpper(1.02, 4), approx = chiSqUpperWH(1.02, 4);
		expect(Math.abs(exact - approx)).toBeGreaterThan(5e-4);
		expect(Math.abs(exact - approx)).toBeLessThan(2e-3);
	});
	test('gamma helpers', () => {
		close(lnGamma(5), Math.log(24), 1e-13); close(lnGamma(0.5), Math.log(Math.sqrt(Math.PI)), 1e-13);
		close(gammaQ(1, 2), Math.exp(-2), 1e-14);
	});
});

describe('Rng', () => {
	test('is deterministic per seed and differs across seeds', () => {
		const a = new Rng(1), b = new Rng(1), c = new Rng(2);
		const va = Array.from({ length: 5 }, () => a.next()), vb = Array.from({ length: 5 }, () => b.next());
		expect(va).toEqual(vb);
		expect(va).not.toEqual(Array.from({ length: 5 }, () => c.next()));
	});
	test('does not cycle in a million draws (the old LCG cycled at 10,466)', () => {
		const r = new Rng(424242), first = r.next();
		for (let i = 1; i < 1_000_000; i++) if (r.next() === first && i > 0) {
			// A single collision on a 32-bit output is expected; a genuine cycle would repeat the following draws too.
			const s = new Rng(424242); s.next();
			const nxt = [r.next(), r.next(), r.next()], base = [s.next(), s.next(), s.next()];
			expect(nxt).not.toEqual(base);
		}
	});
	test('uniform draws are uniform across 16 bins', () => {
		const r = new Rng(99), bins = Array(16).fill(0), n = 160_000;
		for (let i = 0; i < n; i++) bins[Math.floor(r.uniform() * 16)]++;
		const chi = bins.reduce((s, c) => s + (c - n / 16) ** 2 / (n / 16), 0);
		expect(chiSqUpper(chi, 15)).toBeGreaterThan(0.001);
	});
	test('normal draws have mean 0, variance 1, and thin tails', () => {
		const r = new Rng(2024), n = 200_000;
		let s = 0, s2 = 0, s4 = 0;
		for (let i = 0; i < n; i++) { const v = r.normal(); s += v; s2 += v * v; s4 += v ** 4; }
		close(s / n, 0, 0.01); close(s2 / n, 1, 0.02); close(s4 / n, 3, 0.1);
	});
	test('shuffle is a permutation', () => {
		const r = new Rng(4), a = r.shuffle(Array.from({ length: 100 }, (_, i) => i));
		expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 100 }, (_, i) => i));
	});
});

describe('multiple comparisons', () => {
	test('Holm rejects at least what Bonferroni rejects, and the textbook example', () => {
		const p = [0.0001, 0.0017, 0.012, 0.03, 0.5];
		expect(bonferroni(p, 0.05)).toEqual([true, true, false, false, false]);
		expect(holm(p, 0.05)).toEqual([true, true, true, false, false]);
		const b = bonferroni(p, 0.05), h = holm(p, 0.05);
		b.forEach((v, i) => { if (v) expect(h[i]).toBe(true); });
	});
	test('bootstrap p has the +1 floor and a Monte Carlo SE', () => {
		const draws = Array.from({ length: 999 }, (_, i) => i / 1000);
		expect(bootstrapP(2, draws).p).toBe(1 / 1000);
		expect(bootstrapP(-1, draws).p).toBe(1);
		const mid = bootstrapP(0.5, draws);
		close(mid.p, 0.5, 0.002);
		close(mid.mcSe, Math.sqrt(0.25 / 999), 1e-3);
	});
});
