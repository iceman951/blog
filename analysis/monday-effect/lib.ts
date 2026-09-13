/** Minimal OLS with Newey-West (HAC) standard errors, exact tail probabilities, a
 *  PRNG worth the name, and Holm's step-down. No dependencies. */
export type Matrix = number[][];

export const inverse = (A: Matrix): Matrix => {
	const n = A.length;
	const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
	for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		[M[c], M[p]] = [M[p], M[c]];
		const piv = M[c][c];
		if (Math.abs(piv) < 1e-12) throw new Error('singular');
		for (let k = 0; k < 2 * n; k++) M[c][k] /= piv;
		for (let r = 0; r < n; r++) {
			if (r === c) continue;
			const f = M[r][c];
			for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k];
		}
	}
	return M.map((row) => row.slice(n));
};

export interface Fit {
	beta: number[];
	se: number[];
	seOls: number[];
	t: number[];
	n: number;
	k: number;
	lag: number;
	r2: number;
	vcov: Matrix;
	resid: number[];
	fitted: number[];
}

/** Greene's rule-of-thumb Bartlett bandwidth: 8 lags at n = 2512. */
export const bandwidth = (n: number) => Math.floor(4 * (n / 100) ** (2 / 9));

/**
 * OLS with Newey-West covariance. Daily returns are heteroskedastic and mildly
 * autocorrelated, so plain OLS standard errors overstate precision. `lag = 0`
 * gives White's HC0. Pass a precomputed (X'X)^-1 when refitting the same design
 * thousands of times; the bootstrap does.
 */
export const ols = (X: Matrix, y: number[], lag?: number, XtXinv?: Matrix): Fit => {
	const n = y.length;
	const k = X[0].length;
	if (!XtXinv) {
		const XtX: Matrix = Array.from({ length: k }, () => Array(k).fill(0));
		for (let i = 0; i < n; i++)
			for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
		XtXinv = inverse(XtX);
	}
	const Xty: number[] = Array(k).fill(0);
	for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) Xty[a] += X[i][a] * y[i];
	const inv = XtXinv;
	const beta = Array.from({ length: k }, (_, a) => inv[a].reduce((s, v, b) => s + v * Xty[b], 0));
	const fitted = X.map((row) => row.reduce((s, v, a) => s + v * beta[a], 0));
	const resid = y.map((yi, i) => yi - fitted[i]);

	const ybar = y.reduce((s, v) => s + v, 0) / n;
	const ssTot = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
	const ssRes = resid.reduce((s, v) => s + v * v, 0);
	const r2 = 1 - ssRes / ssTot;

	// Classical OLS covariance, kept for comparison with the HAC version.
	const s2 = ssRes / (n - k);
	const seOls = Array.from({ length: k }, (_, a) => Math.sqrt(s2 * inv[a][a]));

	const L = lag ?? bandwidth(n);
	const S = hacMeat(X, resid, L);
	const vcov = sandwich(inv, S);
	const se = Array.from({ length: k }, (_, a) => Math.sqrt(Math.max(vcov[a][a], 0)));
	return { beta, se, seOls, t: beta.map((b, a) => b / se[a]), n, k, lag: L, r2, vcov, resid, fitted };
};

/** Σ_l w_l Σ_t e_t e_{t-l} (x_t x_{t-l}' + x_{t-l} x_t'), Bartlett weights. */
export const hacMeat = (X: Matrix, resid: number[], L: number): Matrix => {
	const n = resid.length, k = X[0].length;
	const S: Matrix = Array.from({ length: k }, () => Array(k).fill(0));
	for (let l = 0; l <= L; l++) {
		const w = l === 0 ? 1 : 1 - l / (L + 1);
		for (let i = l; i < n; i++) {
			const ee = w * resid[i] * resid[i - l];
			const xi = X[i], xl = X[i - l];
			for (let a = 0; a < k; a++)
				for (let b = 0; b < k; b++) S[a][b] += ee * (l === 0 ? xi[a] * xi[b] : xi[a] * xl[b] + xl[a] * xi[b]);
		}
	}
	return S;
};

export const sandwich = (XtXinv: Matrix, S: Matrix): Matrix => {
	const k = S.length;
	const SX = S.map((row) => Array.from({ length: k }, (_, b) => row.reduce((s, v, c) => s + v * XtXinv[c][b], 0)));
	return XtXinv.map((row) => Array.from({ length: k }, (_, b) => row.reduce((s, v, c) => s + v * SX[c][b], 0)));
};

/** Wald test that a set of coefficients are jointly zero. */
export const waldJoint = (fit: Fit, idx: number[]): { stat: number; df: number } => {
	const sub = idx.map((i) => idx.map((j) => fit.vcov[i][j]));
	const b = idx.map((i) => fit.beta[i]);
	const inv = inverse(sub);
	const stat = b.reduce((s, bi, i) => s + bi * inv[i].reduce((t, v, j) => t + v * b[j], 0), 0);
	return { stat, df: idx.length };
};

// ---- Tail probabilities. Exact algorithms, not curve fits: the article reports
// p-values to three or four figures, so the helper has to be good to more than that.

/** erfc(x) for x >= 0: Taylor series near zero, Lentz continued fraction in the tail. */
export const erfc = (x: number): number => {
	if (x < 0) return 2 - erfc(-x);
	if (x < 2.5) {
		// erf(x) = 2/sqrt(pi) * sum (-1)^n x^(2n+1) / (n! (2n+1)); ~50 terms at x = 2.5.
		let term = x, sum = x;
		for (let n = 1; n < 200; n++) {
			term *= -x * x / n;
			const add = term / (2 * n + 1);
			sum += add;
			if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
		}
		return 1 - (2 / Math.sqrt(Math.PI)) * sum;
	}
	// erfc(x) = exp(-x^2)/sqrt(pi) * 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...)))), modified Lentz.
	const tiny = 1e-300;
	let f = x, C = x, D = 0;
	for (let i = 1; i < 500; i++) {
		const a = i / 2;
		D = x + a * D; if (Math.abs(D) < tiny) D = tiny; D = 1 / D;
		C = x + a / C; if (Math.abs(C) < tiny) C = tiny;
		const delta = C * D;
		f *= delta;
		if (Math.abs(delta - 1) < 1e-16) break;
	}
	return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
};

/** Standard normal upper tail P(Z > z). */
export const normalUpper = (z: number): number => 0.5 * erfc(z / Math.SQRT2);

/** Two-sided normal p-value; with n > 2000 the t and normal tails agree past the third decimal. */
export const pValue = (t: number): number => 2 * normalUpper(Math.abs(t));

/** ln Γ(x), Lanczos (g = 7, n = 9); relative error ~1e-15 for x > 0. */
export const lnGamma = (x: number): number => {
	const c = [
		0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
		-176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
		1.5056327351493116e-7,
	];
	if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
	x -= 1;
	let a = c[0];
	const t = x + 7.5;
	for (let i = 1; i < 9; i++) a += c[i] / (x + i);
	return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
};

/** Regularized upper incomplete gamma Q(a, x): series for P when x < a + 1, continued fraction otherwise. */
export const gammaQ = (a: number, x: number): number => {
	if (x <= 0) return 1;
	const lg = lnGamma(a);
	if (x < a + 1) {
		let term = 1 / a, sum = term;
		for (let n = 1; n < 1000; n++) {
			term *= x / (a + n);
			sum += term;
			if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
		}
		return 1 - sum * Math.exp(-x + a * Math.log(x) - lg);
	}
	const tiny = 1e-300;
	let b = x + 1 - a, C = 1 / tiny, D = 1 / b, h = D;
	for (let i = 1; i < 1000; i++) {
		const an = -i * (i - a);
		b += 2;
		D = an * D + b; if (Math.abs(D) < tiny) D = tiny;
		C = b + an / C; if (Math.abs(C) < tiny) C = tiny;
		D = 1 / D;
		const delta = D * C;
		h *= delta;
		if (Math.abs(delta - 1) < 1e-16) break;
	}
	return Math.exp(-x + a * Math.log(x) - lg) * h;
};

/** Upper-tail chi-square probability, exact via the regularized gamma function. */
export const chiSqUpper = (x: number, df: number): number => gammaQ(df / 2, x / 2);

/**
 * Wilson–Hilferty approximation, kept only so the tests can show how far the
 * article's earlier numbers were from the exact tail.
 */
export const chiSqUpperWH = (x: number, df: number): number => {
	const z = ((x / df) ** (1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
	return normalUpper(z);
};

// ---- Random numbers. The first version of this analysis used a hand-rolled LCG whose
// state, after JavaScript's double arithmetic and a 31-bit mask, cycled every 10,466
// draws. A 2,512-day shuffle consumes 2,512 draws, so "2,000 permutations" were four.

/** xoshiro128** seeded by splitmix32. Period 2^128 − 1; passes the usual batteries. */
export class Rng {
	private s: Uint32Array;
	constructor(seed: number) {
		this.s = new Uint32Array(4);
		let x = seed >>> 0;
		for (let i = 0; i < 4; i++) {
			x = (x + 0x9e3779b9) >>> 0;
			let z = x;
			z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
			z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
			this.s[i] = (z ^ (z >>> 15)) >>> 0;
		}
	}
	/** Uniform 32-bit integer. */
	next(): number {
		const s = this.s;
		const result = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
		const t = s[1] << 9;
		s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
		s[2] ^= t;
		s[3] = rotl(s[3], 11);
		return result;
	}
	/** Uniform in [0, 1) with 32 bits of resolution. */
	uniform(): number {
		return this.next() / 4294967296;
	}
	/** Standard normal, Box–Muller (the sine draw is discarded to keep the stream simple). */
	normal(): number {
		let u = 0;
		while (u === 0) u = this.uniform();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.uniform());
	}
	/** Fisher–Yates, in place. */
	shuffle<T>(a: T[]): T[] {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(this.uniform() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}
}
const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;

// ---- Multiple comparisons.

/** Holm's step-down: which hypotheses are rejected at family-wise level alpha. Valid under any dependence. */
export const holm = (p: number[], alpha: number): boolean[] => {
	const order = p.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
	const reject = Array(p.length).fill(false);
	for (let r = 0; r < order.length; r++) {
		const [v, i] = order[r];
		if (v > alpha / (p.length - r)) break;
		reject[i] = true;
	}
	return reject;
};

/** Bonferroni: same guarantee, uniformly less power than Holm. */
export const bonferroni = (p: number[], alpha: number): boolean[] => p.map((v) => v <= alpha / p.length);

/**
 * Bootstrap p-value with its Monte Carlo standard error. The +1 keeps the
 * estimate away from zero: with B draws the smallest reportable p is 1/(B+1).
 */
export const bootstrapP = (observed: number, draws: number[]) => {
	const B = draws.length;
	const exceed = draws.filter((d) => d >= observed).length;
	const p = (exceed + 1) / (B + 1);
	return { p, exceed, B, mcSe: Math.sqrt((p * (1 - p)) / B), resolution: 1 / (B + 1) };
};

export const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
