// Hero and inline SVG figures for the benchmark and Financial Engineering posts.
//
//   node scripts/generate-charts.mjs
//
// These files are shown through <img>, so they cannot load web fonts or follow the
// site's theme toggle. They are drawn for the white hero plate (DESIGN.md §6) with
// the light tokens from src/styles/global.css, and system font stacks.
//
// Type is sized for the plate, not the viewBox. Figures are 720 units wide and the
// plate shows an SVG hero at no more than its own width (BlogPost.astro), so on
// desktop one unit is one pixel and nothing is smaller than 18px. On a ~342px phone
// they scale to 0.47x: data labels (22 units) land near 10px, titles near 16px.
import fs from 'node:fs';

const C = {
	text: '#0f172a',
	muted: '#475569',
	faint: '#64748b',
	grid: '#e2e8f0',
	axis: '#cbd5e1',
	series1: '#0369a1',
	series2: '#c2410c',
	series3: '#7c3aed',
};

const SANS = `Inter, 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, 'Noto Sans Thai', 'Leelawadee UI', Thonburi, sans-serif`;

const STYLE = `
	<style>
		text { font-family: ${SANS}; fill: ${C.text}; }
		.title { font-size: 32px; font-weight: 600; letter-spacing: -0.01em; }
		.subtitle { font-size: 20px; fill: ${C.muted}; }
		.label { font-size: 22px; }
		.value { font-size: 21px; font-weight: 600; font-variant-numeric: tabular-nums; }
		.tick { font-size: 18px; fill: ${C.faint}; font-variant-numeric: tabular-nums; }
		.note { font-size: 19px; fill: ${C.muted}; }
		.grid { stroke: ${C.grid}; stroke-width: 1; }
		.axis { stroke: ${C.axis}; stroke-width: 1.5; }
	</style>`;

const svg = (width, height, label, body) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}">${STYLE}
${body}
</svg>
`;

/** Rounded data end, square at the baseline (DESIGN.md §7). */
const bar = (x, y, w, h, fill, r = 4) => {
	const rr = Math.min(r, w);
	return `<path d="M${x} ${y} H${x + w - rr} A${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V${y + h - rr} A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H${x} Z" fill="${fill}"/>`;
};

/** Horizontal bar chart, one series, rows in the order given. */
function rowsChart({ width, title, subtitle, rows, max, ticks, tickLabel, value, note, label }) {
	const left = 200;
	const right = 576;
	const top = 124;
	const row = rows.length > 5 ? 46 : 56;
	const barH = rows.length > 5 ? 28 : 32;
	const bottom = top + rows.length * row;
	const x = (v) => left + (v / max) * (right - left);

	let body = `
	<text x="24" y="46" class="title">${title}</text>
	<text x="24" y="80" class="subtitle">${subtitle}</text>`;

	for (const t of ticks) {
		body += `
	<line x1="${x(t)}" y1="${top - 8}" x2="${x(t)}" y2="${bottom}" class="grid"/>
	<text x="${x(t)}" y="${bottom + 28}" class="tick" text-anchor="middle">${tickLabel(t)}</text>`;
	}
	body += `
	<line x1="${left}" y1="${top - 8}" x2="${left}" y2="${bottom}" class="axis"/>`;

	rows.forEach((r, i) => {
		const y = top + i * row + (row - barH) / 2;
		const w = x(r.value) - left;
		body += `
	<text x="${left - 16}" y="${y + barH / 2 + 7}" class="label" text-anchor="end">${r.name}</text>
	${bar(left, y, w, barH, C.series1)}
	<text x="${left + w + 12}" y="${y + barH / 2 + 7}" class="value">${value(r.value)}</text>`;
	});

	const notes = [].concat(note);
	const height = bottom + 66 + notes.length * 28;
	notes.forEach((line, i) => {
		body += `
	<text x="24" y="${bottom + 76 + i * 28}" class="note">${line}</text>`;
	});
	return svg(width, height, label, body);
}

function bunThroughput() {
	return rowsChart({
		width: 720,
		label: 'Average throughput by framework on Bun, MacBook Air M5',
		title: 'Average throughput on Bun',
		subtitle: 'Requests/sec · mean of 5 isolated, reshuffled rounds',
		rows: [
			{ name: 'elysia', value: 137024 },
			{ name: 'elysia-aot', value: 136707 },
			{ name: 'bun', value: 132032 },
			{ name: 'h3', value: 131828 },
			{ name: 'hono', value: 130556 },
			{ name: 'bun-web-standard', value: 128878 },
			{ name: 'effect', value: 101534 },
			{ name: 'express', value: 59273 },
		],
		max: 150000,
		ticks: [0, 50000, 100000, 150000],
		tickLabel: (t) => (t === 0 ? '0' : `${t / 1000}k`),
		value: (v) => v.toLocaleString('en-US'),
		note: ['Each round averages ping, query, body and video', 'MacBook Air M5, 24 GB · Bun 1.4.0 · higher is better'],
	});
}

function energy() {
	return rowsChart({
		width: 720,
		label: 'Energy per request by Bun HTTP framework on MacBook Air M5',
		title: 'Energy per request on an M5 Air',
		subtitle: 'Millijoules of SoC energy per request',
		rows: [
			{ name: 'elysia', value: 0.0958 },
			{ name: 'bun', value: 0.0999 },
			{ name: 'hono', value: 0.101 },
			{ name: 'effect', value: 0.124 },
			{ name: 'express', value: 0.1702 },
		],
		max: 0.2,
		ticks: [0, 0.05, 0.1, 0.15, 0.2],
		tickLabel: (t) => t.toFixed(2),
		value: (v) => `${v.toFixed(4)} mJ`,
		note: ['Request-weighted over ping, query and body', '25 measurements at 22 °C, powermetrics · lower is better'],
	});
}

function elysiaHonoPostgres() {
	const width = 720;
	const workloads = [
		{ name: 'get-user', elysia: 72532, hono: 71283 },
		{ name: 'list-users', elysia: 45950, hono: 45773 },
		{ name: 'user-orders', elysia: 52884, hono: 52749 },
		{ name: 'create-order', elysia: 19913, hono: 20018 },
	];
	const left = 170;
	const right = 580;
	const top = 150;
	const group = 86;
	const barH = 24;
	const max = 80000;
	const bottom = top + workloads.length * group;
	const x = (v) => left + (v / max) * (right - left);

	let body = `
	<text x="24" y="46" class="title">Elysia vs Hono with PostgreSQL</text>
	<text x="24" y="80" class="subtitle">Median successful req/s at 100 connections</text>
	<rect x="24" y="102" width="16" height="16" rx="3" fill="${C.series1}"/>
	<text x="48" y="117" class="label">elysia</text>
	<rect x="132" y="102" width="16" height="16" rx="3" fill="${C.series2}"/>
	<text x="156" y="117" class="label">hono</text>`;

	for (const t of [0, 20000, 40000, 60000, 80000]) {
		body += `
	<line x1="${x(t)}" y1="${top}" x2="${x(t)}" y2="${bottom - 14}" class="grid"/>
	<text x="${x(t)}" y="${bottom + 14}" class="tick" text-anchor="middle">${t === 0 ? '0' : `${t / 1000}k`}</text>`;
	}
	body += `
	<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom - 14}" class="axis"/>`;

	workloads.forEach((w, i) => {
		const y = top + i * group + 8;
		const we = x(w.elysia) - left;
		const wh = x(w.hono) - left;
		body += `
	<text x="${left - 14}" y="${y + barH + 9}" class="label" text-anchor="end">${w.name}</text>
	${bar(left, y, we, barH, C.series1)}
	<text x="${left + we + 10}" y="${y + barH / 2 + 7}" class="value">${w.elysia.toLocaleString('en-US')}</text>
	${bar(left, y + barH + 4, wh, barH, C.series2)}
	<text x="${left + wh + 10}" y="${y + barH * 1.5 + 11}" class="value">${w.hono.toLocaleString('en-US')}</text>`;
	});

	const height = bottom + 112;
	body += `
	<text x="24" y="${bottom + 56}" class="note">Largest gap 1.75% (get-user), inside the 2.94% repeat</text>
	<text x="24" y="${bottom + 84}" class="note">spread — no winner named · 5 repetitions · MacBook Air M5</text>`;
	return svg(width, height, 'Elysia and Hono throughput with PostgreSQL on MacBook Air M5, by workload', body);
}

/**
 * Euler diagram. Both posts use the `.th` file, which adds the Thai name under the
 * centre label; labels match the post: mathematics, finance and programming.
 */
function venn(lang) {
	const th = lang === 'th';
	const width = 720;
	const height = 540;
	const circle = (cx, cy, color) =>
		`<circle cx="${cx}" cy="${cy}" r="160" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="2.5"/>`;
	// A white halo keeps labels readable where circles overlap.
	const halo = `paint-order="stroke" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"`;
	const node = (x, y, title, sub) => `
	<text x="${x}" y="${y}" text-anchor="middle" font-size="28" font-weight="600" ${halo}>${title}</text>
	<text x="${x}" y="${y + 30}" text-anchor="middle" font-size="19" fill="${C.muted}" ${halo}>${sub}</text>`;

	const body = `
	${circle(270, 190, C.series1)}
	${circle(450, 190, C.series2)}
	${circle(360, 340, C.series3)}
	${node(200, 160, 'Mathematics', 'Calculus · Statistics')}
	${node(520, 160, 'Finance', 'Investment ·')}
	<text x="520" y="214" text-anchor="middle" font-size="19" fill="${C.muted}" ${halo}>Derivatives · Risk</text>
	${node(360, 430, 'Programming', 'Python · Data')}
	<text x="360" y="${th ? 236 : 248}" text-anchor="middle" font-size="23" font-weight="600" ${halo}>Financial</text>
	<text x="360" y="${th ? 266 : 278}" text-anchor="middle" font-size="23" font-weight="600" ${halo}>Engineering</text>
	${th ? `<text x="360" y="296" text-anchor="middle" font-size="19" fill="${C.series1}" ${halo}>วิศวกรรมการเงิน</text>` : ''}`;
	return svg(width, height, 'Financial Engineering is where Mathematics, Finance and Programming overlap', body);
}

const out = {
	'src/assets/bun-framework-throughput-m5.svg': bunThroughput(),
	'src/assets/elysia-hono-postgres-m5.svg': elysiaHonoPostgres(),
	'src/assets/energy-per-request-m5.svg': energy(),
	'src/assets/financial-engineering-venn.svg': venn('en'),
	'src/assets/financial-engineering-venn.th.svg': venn('th'),
};
for (const [file, content] of Object.entries(out)) {
	fs.writeFileSync(file, content, 'utf-8');
	console.log(`✓ ${file}`);
}
