#!/usr/bin/env bun
/**
 * Generates the post hero from the measurement data, so it can never drift
 * from the numbers in the prose. 1020x510 matches BlogPost.astro's <img>.
 *
 * Standalone SVG: hardcoded hex (no CSS vars), matching the previous post's
 * hero, because it is referenced via <img src> where CSS variables do not apply.
 */
import data from '../src/data/energy-benchmark-m5.json';

const W = 1020;
const H = 510;
const LEFT = 210;
const RIGHT = 150;
const TOP = 112;
const BOTTOM = 54;

const CREAM = '#faf9f5';
const INK = '#262320';
const GRAY = '#786e64';
const GRID = '#e9e3d8';
const ACCENT = '#cc785c';

const order = data.aggregates.rankings.byMjPerReq as string[];
const rows = order.map((fw) => ({
	label: fw,
	value: (data.aggregates.byFramework as any)[fw].weightedSmallRoutes.meanMjPerReq as number,
}));

const max = Math.max(...rows.map((r) => r.value));
const step = 0.05;
const axisMax = Math.ceil(max / step) * step;
const ticks: number[] = [];
for (let t = 0; t <= axisMax + 1e-9; t += step) ticks.push(Number(t.toFixed(10)));

const x = (v: number) => LEFT + (v / axisMax) * (W - LEFT - RIGHT);
const plotH = H - TOP - BOTTOM;
const rowH = plotH / rows.length;
const barH = Math.min(34, rowH - 14);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const F = 'Helvetica, Arial, sans-serif';

const parts: string[] = [];
parts.push(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
		`aria-label="Energy per request by Bun HTTP framework on a MacBook Air M5, request-weighted over the ping, query and body routes">`,
);
parts.push(`<rect width="${W}" height="${H}" fill="${CREAM}"/>`);
parts.push(`<text x="60" y="56" font-family="${F}" font-size="25" font-weight="700" fill="${INK}">Energy per request — Bun HTTP frameworks on an M5 Air</text>`);
parts.push(
	`<text x="60" y="82" font-family="${F}" font-size="14" fill="${GRAY}">` +
		`Millijoules of SoC compute energy per request, request-weighted over ping + query + body. ` +
		`25 measurements, 22 °C. Lower is better.</text>`,
);

for (const t of ticks) {
	parts.push(`<line x1="${x(t).toFixed(1)}" y1="${TOP}" x2="${x(t).toFixed(1)}" y2="${H - BOTTOM}" stroke="${GRID}" stroke-width="1"/>`);
	parts.push(`<text x="${x(t).toFixed(1)}" y="${H - BOTTOM + 20}" font-family="${F}" font-size="11" fill="${GRAY}" text-anchor="middle">${t.toFixed(2)}</text>`);
}

rows.forEach((r, i) => {
	const y = TOP + i * rowH + (rowH - barH) / 2;
	const w = Math.max(x(r.value) - LEFT, 2);
	const rr = Math.min(4, w);
	parts.push(
		`<path d="M${LEFT} ${y.toFixed(1)} H${(LEFT + w - rr).toFixed(1)} A${rr} ${rr} 0 0 1 ${(LEFT + w).toFixed(1)} ${(y + rr).toFixed(1)} ` +
			`V${(y + barH - rr).toFixed(1)} A${rr} ${rr} 0 0 1 ${(LEFT + w - rr).toFixed(1)} ${(y + barH).toFixed(1)} H${LEFT} Z" fill="${ACCENT}"/>`,
	);
	parts.push(`<text x="${LEFT - 14}" y="${(y + barH / 2 + 5).toFixed(1)}" font-family="${F}" font-size="15" fill="${INK}" text-anchor="end">${esc(r.label)}</text>`);
	parts.push(`<text x="${(LEFT + w + 12).toFixed(1)}" y="${(y + barH / 2 + 5).toFixed(1)}" font-family="${F}" font-size="13" fill="${GRAY}">${r.value.toFixed(4)} mJ</text>`);
});

parts.push(`<line x1="${LEFT}" y1="${TOP}" x2="${LEFT}" y2="${H - BOTTOM}" stroke="${GRAY}" stroke-width="1"/>`);
parts.push('</svg>');

await Bun.write('src/assets/energy-per-request-m5.svg', parts.join('\n') + '\n');
console.log(`wrote src/assets/energy-per-request-m5.svg (${rows.length} bars, axis max ${axisMax.toFixed(2)} mJ)`);
