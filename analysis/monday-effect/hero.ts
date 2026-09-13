#!/usr/bin/env bun
/** Builds the post hero from results.json, so the plate cannot drift from the numbers. */
import { readFileSync, writeFileSync } from 'node:fs';

const r = JSON.parse(readFileSync('../../public/analysis/monday-effect/results.json', 'utf8'));
const tickers: string[] = r.tickers;

const W = 1020, H = 510, LEFT = 150, RIGHT = 120, TOP = 122, BOTTOM = 62;
const PAPER = '#f4efe4', INK = '#1e1c19', MUTED = '#777064', GRID = '#ddd5c8';
const A = '#263746', B = '#a63d32';
const F = 'Helvetica, Arial, sans-serif';

// Log scale: the two quantities differ by an order of magnitude, which is the point.
const lo = 1, hi = 1000;
const x = (v: number) => LEFT + ((Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (W - LEFT - RIGHT);

const plotH = H - TOP - BOTTOM;
const rowH = plotH / tickers.length;
const barH = 11;

const out: string[] = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
	`aria-label="For eight US technology stocks, the spread in a ten-year weekly dollar-cost-averaging outcome from choosing a weekday, against the spread from starting the plan in a different week. The start week matters between eight and twenty-six times more.">`);
out.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
out.push(`<text x="60" y="56" font-family="${F}" font-size="25" font-weight="700" fill="${INK}">Choosing the weekday barely moves a ten-year DCA</text>`);
out.push(`<text x="60" y="82" font-family="${F}" font-size="14" fill="${MUTED}">Spread between best and worst outcome, in percentage points of total return. $100 invested weekly, Sep 2016 – Sep 2026.</text>`);

// legend
out.push(`<rect x="60" y="96" width="11" height="11" fill="${A}"/><text x="77" y="106" font-family="${F}" font-size="12" fill="${INK}">which weekday you buy on</text>`);
out.push(`<rect x="300" y="96" width="11" height="11" fill="${B}"/><text x="317" y="106" font-family="${F}" font-size="12" fill="${INK}">which week you happened to start</text>`);

for (const t of [1, 10, 100, 1000]) {
	out.push(`<line x1="${x(t).toFixed(1)}" y1="${TOP}" x2="${x(t).toFixed(1)}" y2="${H - BOTTOM}" stroke="${GRID}" stroke-width="1"/>`);
	out.push(`<text x="${x(t).toFixed(1)}" y="${H - BOTTOM + 20}" font-family="${F}" font-size="11" fill="${MUTED}" text-anchor="middle">${t}</text>`);
}
out.push(`<text x="${((LEFT + W - RIGHT) / 2).toFixed(0)}" y="${H - 18}" font-family="${F}" font-size="12" fill="${INK}" text-anchor="middle">percentage points of total return (log scale)</text>`);

tickers.forEach((t, i) => {
	const d = r.dca[t];
	const top = TOP + i * rowH;
	const mid = top + rowH / 2;
	out.push(`<text x="${LEFT - 14}" y="${(mid + 5).toFixed(1)}" font-family="${F}" font-size="14" fill="${INK}" text-anchor="end">${t}</text>`);
	const y1 = mid - barH - 2, y2 = mid + 2;
	out.push(`<rect x="${LEFT}" y="${y1.toFixed(1)}" width="${(x(d.weekdaySpreadPoints) - LEFT).toFixed(1)}" height="${barH}" fill="${A}"/>`);
	out.push(`<rect x="${LEFT}" y="${y2.toFixed(1)}" width="${(x(d.startWeekSpreadPoints) - LEFT).toFixed(1)}" height="${barH}" fill="${B}"/>`);
	out.push(`<text x="${(x(d.startWeekSpreadPoints) + 10).toFixed(1)}" y="${(mid + 5).toFixed(1)}" font-family="${F}" font-size="12" fill="${MUTED}">${d.ratio}x</text>`);
	out.push(`<text x="${(x(d.weekdaySpreadPoints) + 8).toFixed(1)}" y="${(y1 + 9).toFixed(1)}" font-family="${F}" font-size="10" fill="${MUTED}">${d.weekdaySpreadPoints}</text>`);
	out.push(`<text x="${(x(d.startWeekSpreadPoints) + 8).toFixed(1)}" y="${(y2 + 9).toFixed(1)}" font-family="${F}" font-size="10" fill="${MUTED}" opacity="0">${d.startWeekSpreadPoints}</text>`);
});
out.push(`<line x1="${LEFT}" y1="${TOP}" x2="${LEFT}" y2="${H - BOTTOM}" stroke="${MUTED}" stroke-width="1"/>`);
out.push('</svg>');

writeFileSync('../../src/assets/monday-effect-dca.svg', out.join('\n') + '\n');
console.log('wrote src/assets/monday-effect-dca.svg');
