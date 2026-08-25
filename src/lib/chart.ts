/**
 * Chart primitives shared by the SVG chart components.
 *
 * Palette validated with the dataviz skill's checker against this site's cream
 * surface (#faf9f5), not chosen by eye:
 *   blue/terracotta/gold  — CVD separation dE 18.2, normal-vision dE 20.9 (all pairs)
 * The gold sits at 1.91:1 contrast, so every chart using it must also carry
 * visible value labels and a data table. That relief is required, not optional.
 */
export const PALETTE = {
	accent: '#cc785c',
	accentDark: '#a6553b',
	ink: 'rgb(38, 35, 32)',
	muted: 'rgb(120, 110, 100)',
	grid: 'rgb(233, 227, 216)',
	surface: '#faf9f5',
} as const;

/** Fixed order — assigned by entity, never cycled, never by rank. */
export const SERIES = ['#1f6fb2', '#c2603f', '#e0b040'] as const;
export const SERIES_STROKE: Record<string, string> = { '#e0b040': '#a8801d' };
/** Residual buckets ("other", tooling) are deliberately neutral. */
export const NEUTRAL = ['#7a7266', '#b3aa9d'] as const;

export type Scale = (v: number) => number;

export const linear = (d0: number, d1: number, r0: number, r1: number): Scale => {
	const span = d1 - d0 || 1;
	return (v) => r0 + ((v - d0) / span) * (r1 - r0);
};

/**
 * "Nice" axis ticks on 1/2/5 x 10^n boundaries.
 *
 * The returned ticks always BRACKET [min, max] — the first is <= min and the
 * last is >= max. Charts derive their scale domain from the first/last tick, so
 * a tick range narrower than the data would push marks outside the plot area.
 */
export const ticks = (min: number, max: number, count = 5): number[] => {
	const span = max - min || Math.abs(max) || 1;
	const raw = span / count;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
	const first = Math.floor(min / step) * step;
	const last = Math.ceil(max / step) * step;
	const out: number[] = [];
	for (let t = first; t <= last + step * 1e-9; t += step) out.push(Number(t.toFixed(10)));
	return out;
};

export const fmt = (v: number, digits = 0) =>
	v >= 10000
		? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
		: v.toLocaleString('en-US', { maximumFractionDigits: digits });

/** Rounded-end bar path: square at the baseline, 4px radius at the data end. */
export const barPath = (x: number, y: number, w: number, h: number, r = 4, horizontal = false) => {
	if (horizontal) {
		const rr = Math.min(r, w);
		return `M${x} ${y} H${x + w - rr} A${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V${y + h - rr} A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H${x} Z`;
	}
	const rr = Math.min(r, h);
	return `M${x} ${y + rr} A${rr} ${rr} 0 0 1 ${x + rr} ${y} H${x + w - rr} A${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V${y + h} H${x} Z`;
};
