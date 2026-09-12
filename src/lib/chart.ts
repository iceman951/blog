/**
 * Chart primitives shared by the SVG chart components.
 *
 * The palette is the site's own ink-on-washi system (see DESIGN.md) rather than a
 * separate chart palette: sumi ink, indigo and vermilion on paper. Series colours
 * keep the separation the previous blue/terracotta/gold set was validated for —
 * ink against indigo against vermilion stays distinguishable under deuteranopia
 * and protanopia because the pairs differ in lightness as well as hue.
 *
 * Every chart still carries visible value labels and a backing data table, so no
 * reading of these charts depends on colour discrimination alone.
 */
export const PALETTE = {
	accent: '#a63d32',
	accentDark: '#843028',
	ink: '#1e1c19',
	muted: '#777064',
	grid: '#ddd5c8',
	surface: '#f4efe4',
} as const;

/** Fixed order — assigned by entity, never cycled, never by rank. */
export const SERIES = ['#263746', '#a63d32', '#8a7a52'] as const;
export const SERIES_STROKE: Record<string, string> = { '#8a7a52': '#6b5d3c' };
/** Residual buckets ("other", tooling) are deliberately neutral. */
export const NEUTRAL = ['#777064', '#b3a894'] as const;

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
