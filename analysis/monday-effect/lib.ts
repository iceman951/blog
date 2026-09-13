/** Minimal OLS with Newey-West (HAC) standard errors. No dependencies. */
export type Matrix = number[][];

export const solve = (A: Matrix, b: number[]): number[] => {
	const n = b.length;
	const M = A.map((row, i) => [...row, b[i]]);
	for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		[M[c], M[p]] = [M[p], M[c]];
		if (Math.abs(M[c][c]) < 1e-12) throw new Error('singular design matrix');
		for (let r = 0; r < n; r++) {
			if (r === c) continue;
			const f = M[r][c] / M[c][c];
			for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
		}
	}
	return M.map((row, i) => row[n] / row[i][i] as unknown as number).map((_, i) => M[i][n] / M[i][i]);
};

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
	r2: number;
	vcov: Matrix;
	resid: number[];
}

/**
 * OLS with Newey-West covariance. Daily returns are heteroskedastic and mildly
 * autocorrelated, so plain OLS standard errors overstate precision.
 */
export const ols = (X: Matrix, y: number[], lag?: number): Fit => {
	const n = y.length;
	const k = X[0].length;
	const XtX: Matrix = Array.from({ length: k }, () => Array(k).fill(0));
	const Xty: number[] = Array(k).fill(0);
	for (let i = 0; i < n; i++) {
		for (let a = 0; a < k; a++) {
			Xty[a] += X[i][a] * y[i];
			for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
		}
	}
	const XtXinv = inverse(XtX);
	const beta = Array.from({ length: k }, (_, a) => XtXinv[a].reduce((s, v, b) => s + v * Xty[b], 0));
	const resid = y.map((yi, i) => yi - X[i].reduce((s, v, a) => s + v * beta[a], 0));

	const ybar = y.reduce((s, v) => s + v, 0) / n;
	const ssTot = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
	const ssRes = resid.reduce((s, v) => s + v * v, 0);
	const r2 = 1 - ssRes / ssTot;

	// Classical OLS covariance, for comparison with the HAC version.
	const s2 = ssRes / (n - k);
	const seOls = Array.from({ length: k }, (_, a) => Math.sqrt(s2 * XtXinv[a][a]));

	// Newey-West: Bartlett kernel, Greene's rule-of-thumb bandwidth.
	const L = lag ?? Math.floor(4 * (n / 100) ** (2 / 9));
	const S: Matrix = Array.from({ length: k }, () => Array(k).fill(0));
	for (let i = 0; i < n; i++)
		for (let a = 0; a < k; a++)
			for (let b = 0; b < k; b++) S[a][b] += resid[i] ** 2 * X[i][a] * X[i][b];
	for (let l = 1; l <= L; l++) {
		const w = 1 - l / (L + 1);
		for (let i = l; i < n; i++)
			for (let a = 0; a < k; a++)
				for (let b = 0; b < k; b++) {
					const term = resid[i] * resid[i - l] * (X[i][a] * X[i - l][b] + X[i - l][a] * X[i][b]);
					S[a][b] += w * term;
				}
	}
	const vcov: Matrix = Array.from({ length: k }, (_, a) =>
		Array.from({ length: k }, (_, b) =>
			XtXinv[a].reduce((s1, v1, c) => s1 + v1 * S[c].reduce((s2, v2, d) => s2 + v2 * XtXinv[d][b], 0), 0),
		),
	);
	const se = Array.from({ length: k }, (_, a) => Math.sqrt(Math.max(vcov[a][a], 0)));
	return { beta, se, seOls, t: beta.map((b, a) => b / se[a]), n, k, r2, vcov, resid };
};

/** Two-sided normal p-value; with n>2000 the t and normal tails agree to 3 decimals. */
export const pValue = (t: number): number => {
	const z = Math.abs(t);
	const p = 0.3275911, a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
	const x = z / Math.SQRT2, tt = 1 / (1 + p * x);
	const erf = 1 - ((((a[4] * tt + a[3]) * tt + a[2]) * tt + a[1]) * tt + a[0]) * tt * Math.exp(-x * x);
	return 1 - erf;
};

/** Wald test that a set of coefficients are jointly zero. */
export const waldJoint = (fit: Fit, idx: number[]): { stat: number; df: number } => {
	const sub = idx.map((i) => idx.map((j) => fit.vcov[i][j]));
	const b = idx.map((i) => fit.beta[i]);
	const inv = inverse(sub);
	const stat = b.reduce((s, bi, i) => s + bi * inv[i].reduce((t, v, j) => t + v * b[j], 0), 0);
	return { stat, df: idx.length };
};

/**
 * Upper-tail chi-square probability (Wilson–Hilferty).
 * pValue() is two-sided, so half of it is the upper tail only when z >= 0;
 * below zero the upper tail is the complement. Getting this wrong reports
 * p = 0.09 for a statistic whose true p is 0.91.
 */
export const chiSqUpper = (x: number, df: number): number => {
	const z = ((x / df) ** (1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
	const half = pValue(z) / 2;
	return z >= 0 ? half : 1 - half;
};
