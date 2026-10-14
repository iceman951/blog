/**
 * Chart primitives shared by the SVG chart components.
 *
 * Colours are CSS custom properties from global.css (DESIGN.md §3, §7), not hex,
 * so inline charts follow the light/dark theme. Each mode's categorical set was
 * run through the dataviz palette validator against its own surface: lightness
 * band, chroma floor, CVD separation, normal-vision floor and 3:1 contrast.
 *
 * Every chart still carries visible value labels and a backing data table, so no
 * reading of these charts depends on colour discrimination alone.
 */
export const PALETTE = {
	accent: 'var(--series-1)',
	ink: 'var(--text)',
	muted: 'var(--chart-axis)',
	grid: 'var(--chart-grid)',
	surface: 'var(--surface)',
} as const;

/** Fixed order — assigned by entity, never cycled, never by rank. */
export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'] as const;
/** Residual buckets ("other", tooling) are deliberately neutral. */
export const NEUTRAL = ['var(--series-neutral)', 'var(--series-neutral-2)'] as const;
/** Text drawn on a series fill; neutral fills take ordinary text colour instead. */
export const ON_SERIES = 'var(--chart-on-series)';

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
