#!/usr/bin/env bun
/** Dump the key set of a powermetrics plist capture, so the analyzer can be pinned to reality. */
import { readSamples } from './plist.ts'

const path = Bun.argv[2] ?? '/tmp/smoke.plist'
const samples = await readSamples(path)
console.log(`samples parsed: ${samples.length}`)
if (!samples.length) process.exit(1)

const s = samples[Math.min(2, samples.length - 1)]
console.log(`\ntop-level keys:\n  ${Object.keys(s).join('\n  ')}`)

const show = (name: string, v: unknown, depth = 0) => {
	const pad = '  '.repeat(depth + 1)
	if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
		console.log(`${pad}${name}: {`)
		for (const [k, vv] of Object.entries(v as Record<string, unknown>)) {
			if (Array.isArray(vv)) {
				console.log(`${pad}  ${k}: [${vv.length}]`)
				if (vv.length && typeof vv[0] === 'object') show(`${k}[0]`, vv[0], depth + 2)
			} else if (vv && typeof vv === 'object' && !(vv instanceof Date)) show(k, vv, depth + 1)
			else console.log(`${pad}  ${k} = ${String(vv)}`)
		}
		console.log(`${pad}}`)
	} else console.log(`${pad}${name} = ${String(v)}`)
}

for (const key of ['timestamp', 'elapsed_ns', 'is_delta', 'hw_model']) console.log(`\n${key} = ${String(s[key])}`)
for (const key of ['processor', 'thermal', 'pmp']) if (s[key] !== undefined) { console.log(); show(key, s[key]) }

console.log('\n--- energy field probe ---')
const p = s.processor as Record<string, unknown> | undefined
for (const k of ['cpu_energy', 'gpu_energy', 'ane_energy', 'combined_power', 'cpu_power', 'package_energy']) 
	console.log(`  processor.${k} = ${p?.[k] === undefined ? 'ABSENT' : String(p[k])}`)
