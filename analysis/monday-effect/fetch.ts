#!/usr/bin/env bun
/**
 * Downloads the price series into ./data, which is gitignored: the vendor's terms
 * cover redistribution, so this repository carries the derived statistics and this
 * script rather than the prices themselves. Run it and you rebuild the inputs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const TICKERS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD'];
const FROM = '2016-09-13';
const TO = '2026-09-12';
const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

mkdirSync('data', { recursive: true });

for (const ticker of TICKERS) {
	const url =
		`https://api.nasdaq.com/api/quote/${ticker}/historical` +
		`?assetclass=stocks&fromdate=${FROM}&todate=${TO}&limit=99999`;
	const body = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
	writeFileSync(`data/raw_${ticker}.json`, body);
	const rows = JSON.parse(body).data?.tradesTable?.rows?.length ?? 0;
	console.log(`${ticker}: ${rows} rows`);
	// Be a polite client rather than a fast one.
	await new Promise((r) => setTimeout(r, 1200));
}

// S&P 500 from FRED: US government work, no key, redistributable.
const sp = await (await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500')).text();
writeFileSync('data/sp500.csv', sp);
console.log(`SP500: ${sp.trim().split('\n').length - 1} rows`);
