// Raster cards: post heroes that double as og:image, and the site's social cards.
//
//   python scripts/about-og/portrait.py src/assets/icerust-og-anime.png scripts/about-og/portrait-crop.png
//   node scripts/generate-raster-cards.mjs
//
// Cards are HTML set in the site's own fonts (Inter, Noto Sans Thai, JetBrains Mono,
// fetched from Google Fonts) and rendered by headless Chrome at 1.5x of a 1200x630
// layout. Set CHROME_PATH if Chrome is not in a default location.
//
// Type is sized for the smallest place a card appears: a social feed thumbnail about
// 500px wide (0.42x) and a phone hero about 342px wide (0.29x). Nothing is set below
// 20px, so feed text stays near 8px or more and headlines stay large.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const CHROME =
	process.env.CHROME_PATH ??
	[
		'C:/Program Files/Google/Chrome/Application/chrome.exe',
		'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
	].find((p) => fs.existsSync(p));

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Thai:wght@400;600&display=block" rel="stylesheet" />`;

// Tokens from src/styles/global.css.
const DARK = {
	bg: '#090d14',
	surface: '#101622',
	surfaceAlt: '#161f30',
	text: '#f1f5f9',
	muted: '#94a3b8',
	faint: '#8291a7',
	border: '#1e293b',
	accent: '#22d3ee',
};
const LIGHT = {
	bg: '#f8fafc',
	surface: '#ffffff',
	surfaceAlt: '#f1f5f9',
	text: '#0f172a',
	muted: '#475569',
	faint: '#64748b',
	border: '#e2e8f0',
	accent: '#0369a1',
};

const page = (t, css, body, lang = 'en') => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8" />${FONTS}
<style>
	* { box-sizing: border-box; margin: 0; padding: 0; }
	html, body { width: 1200px; height: 630px; overflow: hidden; }
	body {
		position: relative;
		background: ${t.bg};
		color: ${t.text};
		font-family: 'Inter', 'Noto Sans Thai', sans-serif;
		-webkit-font-smoothing: antialiased;
	}
	:lang(th) { font-family: 'Noto Sans Thai', 'Inter', sans-serif; }
	.mono { font-family: 'JetBrains Mono', monospace; }
	${css}
</style></head><body>${body}</body></html>`;

async function render(html, out, { jpeg = false } = {}) {
	if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH.');
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icerust-card-'));
	const htmlFile = path.join(dir, 'card.html');
	const shot = path.join(dir, 'card.png');
	fs.writeFileSync(htmlFile, html, 'utf-8');
	execFileSync(CHROME, [
		'--headless=new',
		'--disable-gpu',
		'--hide-scrollbars',
		'--allow-file-access-from-files',
		'--force-device-scale-factor=1.5',
		'--virtual-time-budget=8000',
		'--window-size=1200,630',
		`--screenshot=${shot}`,
		pathToFileURL(htmlFile).href,
	], { stdio: 'ignore' });
	const img = sharp(shot);
	await (jpeg ? img.jpeg({ quality: 88, progressive: true, mozjpeg: true }) : img.png({ compressionLevel: 9 })).toFile(out);
	fs.rmSync(dir, { recursive: true, force: true });
	console.log(`✓ ${out}`);
}

/**
 * Why is ElysiaJS fast? The pipeline is the post's own example, GET /user?id=42 with
 * no hooks and no schema: Elysia builds only the steps that route uses.
 */
function elysiaCard(lang) {
	const th = lang === 'th';
	const copy = th
		? {
				kicker: 'ElysiaJS · เบื้องหลังความเร็ว',
				title: 'ทำไม ElysiaJS<br /><em>ถึงเร็ว?</em>',
				sub: 'เบื้องหลังการสร้าง Handler เฉพาะ Route',
				panel: 'สร้างเฉพาะขั้นตอนที่ Route นี้ใช้',
				used: 'ใช้',
				skipped: 'ข้าม',
			}
		: {
				kicker: 'ElysiaJS · Under the hood',
				title: 'Why is ElysiaJS<br /><em>fast?</em>',
				sub: 'Inside its route-specific handlers',
				panel: 'Only the steps this route uses',
				used: 'used',
				skipped: 'skipped',
			};
	const steps = [
		['query', true],
		['parse body', false],
		['validate', false],
		['beforeHandle', false],
		['handler', true],
		['afterHandle', false],
		['mapResponse', true],
	];
	const t = DARK;
	const css = `
	.copy { position: absolute; left: 72px; top: 64px; bottom: 60px; width: 560px; display: flex; flex-direction: column; }
	.brand { font-size: 22px; font-weight: 600; letter-spacing: 0.08em; }
	.kicker { margin-top: auto; color: ${t.muted}; font-size: 22px; font-weight: 600; letter-spacing: ${th ? '0' : '0.06em'}; ${th ? '' : 'text-transform: uppercase;'} }
	h1 { margin-top: 14px; font-size: ${th ? 70 : 76}px; font-weight: 600; line-height: ${th ? 1.3 : 1.05}; letter-spacing: ${th ? '0' : '-0.02em'}; }
	h1 em { color: ${t.accent}; font-style: normal; }
	.sub { margin-top: 20px; color: ${t.muted}; font-size: 28px; line-height: 1.4; }
	.chips { display: flex; gap: 10px; margin-top: 28px; margin-bottom: auto; }
	.chip { padding: 6px 14px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.surfaceAlt}; color: ${t.muted}; font-size: 20px; }
	.url { color: ${t.accent}; font-size: 22px; }
	.panel { position: absolute; right: 64px; top: 64px; bottom: 60px; width: 420px; padding: 26px 30px; border: 1px solid ${t.border}; border-radius: 8px; background: ${t.surface}; }
	.panel-head { padding-bottom: 16px; border-bottom: 1px solid ${t.border}; }
	.route { font-size: 22px; color: ${t.text}; }
	.panel-sub { margin-top: 6px; color: ${t.muted}; font-size: 20px; }
	ol { list-style: none; margin-top: 14px; }
	li { display: flex; align-items: center; justify-content: space-between; height: 50px; font-size: 24px; }
	li .dot { width: 12px; height: 12px; margin-right: 16px; border-radius: 50%; background: ${t.accent}; flex: none; }
	li .name { flex: 1; }
	li .state { color: ${t.accent}; font-size: 20px; }
	li.off { color: ${t.faint}; }
	li.off .dot { background: transparent; border: 2px solid ${t.faint}; }
	li.off .state { color: ${t.faint}; }`;
	const body = `
	<div class="copy">
		<div class="brand">ICERUST</div>
		<p class="kicker">${copy.kicker}</p>
		<h1>${copy.title}</h1>
		<p class="sub">${copy.sub}</p>
		<div class="chips"><span class="chip mono">Sucrose</span><span class="chip mono">JIT vs AOT</span><span class="chip mono">Elysia 1.4</span></div>
		<div class="url mono">blog.icerust.dev</div>
	</div>
	<div class="panel">
		<div class="panel-head">
			<div class="route mono">GET /user?id=42</div>
			<div class="panel-sub">${copy.panel}</div>
		</div>
		<ol>${steps
			.map(
				([name, on]) =>
					`<li class="${on ? 'on' : 'off'}"><span class="dot"></span><span class="name mono">${name}</span><span class="state">${on ? copy.used : copy.skipped}</span></li>`,
			)
			.join('')}</ol>
	</div>`;
	return page(t, css, body, lang);
}

/** The portrait cards: About (og + hero) and the site default og:image. */
function portraitCard({ kicker, title, titleSize = 76, role, rows }) {
	const crop = pathToFileURL(path.resolve('scripts/about-og/portrait-crop.png')).href;
	const t = LIGHT;
	const css = `
	/* Source crop x 700–1730 of the 1730x909 portrait, scaled to the card height. */
	.portrait { position: absolute; top: 0; right: 0; width: 714px; height: 630px;
		background: url('${crop}') right top / cover no-repeat;
		-webkit-mask-image: linear-gradient(to right, transparent 0, #000 22%); mask-image: linear-gradient(to right, transparent 0, #000 22%); }
	.copy { position: absolute; top: 0; left: 0; display: flex; flex-direction: column; width: 600px; height: 630px; padding: 56px 0 50px 64px; }
	.brand { font-size: 24px; font-weight: 600; letter-spacing: 0.08em; }
	.who { margin: auto 0; }
	.kicker { margin-bottom: 14px; color: ${t.muted}; font-size: 22px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { font-size: ${titleSize}px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.04; }
	.role { max-width: 430px; margin-top: 16px; color: ${t.muted}; font-size: 28px; line-height: 1.35; }
	.role strong { color: ${t.text}; font-weight: 600; }
	table { width: 430px; margin-top: 26px; border-collapse: collapse; font-size: 21px; line-height: 1.3; }
	td { padding: 10px 14px; border: 1px solid ${t.border}; background: ${t.surface}; }
	td:first-child { width: 124px; background: ${t.surfaceAlt}; color: ${t.muted}; font-weight: 500; }
	.url { color: ${t.accent}; font-size: 24px; }`;
	const body = `
	<div class="portrait"></div>
	<div class="copy">
		<span class="brand">ICERUST</span>
		<div class="who">
			<p class="kicker">${kicker}</p>
			<h1>${title}</h1>
			<p class="role">${role}</p>
			${rows ? `<table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>` : ''}
		</div>
		<span class="url mono">blog.icerust.dev</span>
	</div>`;
	return page(t, css, body);
}

await render(elysiaCard('en'), 'src/assets/why-is-elysiajs-so-fast.png');
await render(elysiaCard('th'), 'src/assets/why-is-elysiajs-so-fast.th.png');

if (fs.existsSync('scripts/about-og/portrait-crop.png')) {
	await render(
		portraitCard({
			kicker: 'About the author',
			title: 'Vorrapong<br />Kertnat',
			role: '<strong>ICE</strong> · Full-stack developer',
			rows: [
				['Work', 'BAAC, Bangkok'],
				['Studying', 'M.Sc. Financial Eng., UTCC'],
			],
		}),
		'src/assets/about-og.jpg',
		{ jpeg: true },
	);
	await render(
		portraitCard({
			// The home page's own headline and standfirst.
			kicker: 'by Vorrapong Kertnat',
			title: 'Small<br />Experiments<br />for a Better<br />Future.',
			titleSize: 64,
			role: 'Notes on technology, markets, and experiments.',
		}),
		'src/assets/icerust-og-card.jpg',
		{ jpeg: true },
	);
} else {
	console.warn('Skipped portrait cards: run scripts/about-og/portrait.py first.');
}
