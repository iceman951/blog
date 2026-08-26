#!/usr/bin/env bun
/**
 * Splits measured SoC joules between processes for the attribution pass.
 *
 * powermetrics' own --show-process-energy number ("energy_impact") is Apple's
 * Activity Monitor heuristic: unitless, undocumented weights. It is NOT joules
 * and is reported here only as a cross-check.
 *
 * The primary split is measured CPU time with P-cores and E-cores weighted
 * separately, since a P-core millisecond costs several times an E-core one.
 * The two weights are fitted from this session's own windows by least squares
 * through the origin, and the fit's R^2 is reported so the reader can judge it.
 *
 *   tasks[].cputime_ns  total CPU time in the sample
 *   tasks[].ptime_ns    of which on performance (S-Cluster) cores
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { parsePlist, splitSamples } from './plist.ts'

const argv = Bun.argv.slice(2)
const flag = (n: string, d = '') => {
	const i = argv.indexOf(`--${n}`)
	return i === -1 ? d : argv[i + 1]
}
const OUT = flag('out')
if (!OUT) throw new Error('--out <sessiondir> required')
const MERGE = flag('merge', '')

type Task = { pid: number; name: string; cpuNs: number; pNs: number; impact: number }
type Samp = { startMs: number; endMs: number; joules: number; tasks: Task[] }

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

const load = async (dir: string): Promise<Samp[]> => {
	const file = readdirSync(dir).find((f) => f.startsWith('power.plist'))!
	const docs = splitSamples(new Uint8Array(readFileSync(`${dir}/${file}`)))
	const raw: { ts: number; elapsedS: number; joules: number; tasks: Task[] }[] = []

	for (const doc of docs) {
		const s = parsePlist(doc) as Record<string, any>
		const ts = s.timestamp instanceof Date ? s.timestamp.getTime() : NaN
		const elapsedS = num(s.elapsed_ns) / 1e9
		if (!Number.isFinite(ts) || elapsedS <= 0) continue
		const p = s.processor ?? {}
		const joules = (num(p.cpu_energy) + num(p.gpu_energy) + num(p.ane_energy)) / 1000
		const tasks: Task[] = (s.tasks ?? []).map((t: any) => ({
			pid: num(t.pid),
			name: String(t.name ?? '?'),
			cpuNs: num(t.cputime_ns),
			pNs: num(t.ptime_ns),
			impact: num(t.energy_impact)
		}))
		raw.push({ ts, elapsedS, joules, tasks })
	}

	// Same 1-second-timestamp correction as analyze.ts: rebuild a precise axis
	// from cumulative elapsed_ns, anchored to the coarse stamps by least squares.
	const cum: number[] = []
	let acc = 0
	for (const r of raw) {
		acc += r.elapsedS * 1000
		cum.push(acc)
	}
	const target = raw.map((r) => r.ts + 500)
	const mx = cum.reduce((a, b) => a + b, 0) / cum.length
	const my = target.reduce((a, b) => a + b, 0) / target.length
	const den = cum.reduce((a, x) => a + (x - mx) ** 2, 0)
	const slope = den ? cum.reduce((a, x, i) => a + (x - mx) * (target[i] - my), 0) / den : 1
	const intercept = my - slope * mx

	return raw.map((r, i) => {
		const endMs = intercept + slope * cum[i]
		return { startMs: endMs - r.elapsedS * 1000 * slope, endMs, joules: r.joules, tasks: r.tasks }
	})
}

const samples = await load(OUT)
const timeline = readFileSync(`${OUT}/timeline.jsonl`, 'utf8')
	.split('\n')
	.filter((l) => l.trim())
	.map((l) => JSON.parse(l))

type Window = {
	framework: string
	route: string
	startMs: number
	endMs: number
	serverPid: number
	bombardierPid: number
	joules: number
	byProc: Map<string, { pNs: number; eNs: number; impact: number }>
	totalP: number
	totalE: number
}

const windows: Window[] = []
for (const m of timeline.filter((r) => r.event === 'measurementComplete')) {
	for (const [route, r] of Object.entries(m.routes as Record<string, any>)) {
		const t0 = r.startedAtMs
		const t1 = r.endedAtMs
		const byProc = new Map<string, { pNs: number; eNs: number; impact: number }>()
		let joules = 0
		let totalP = 0
		let totalE = 0

		for (const s of samples) {
			const span = s.endMs - s.startMs
			const overlap = Math.max(0, Math.min(t1, s.endMs) - Math.max(t0, s.startMs))
			if (overlap <= 0) continue
			const w = overlap / span
			joules += w * s.joules
			for (const t of s.tasks) {
				const key =
					t.pid === m.serverPid ? 'server' : t.pid === r.bombardierPid ? 'bombardier' : t.name
				const pNs = w * t.pNs
				const eNs = w * Math.max(t.cpuNs - t.pNs, 0)
				const cur = byProc.get(key) ?? { pNs: 0, eNs: 0, impact: 0 }
				cur.pNs += pNs
				cur.eNs += eNs
				cur.impact += w * t.impact
				byProc.set(key, cur)
				totalP += pNs
				totalE += eNs
			}
		}
		windows.push({
			framework: m.framework,
			route,
			startMs: t0,
			endMs: t1,
			serverPid: m.serverPid,
			bombardierPid: r.bombardierPid,
			joules,
			byProc,
			totalP,
			totalE
		})
	}
}

// ---------------------------------------------------------------------------
// Can joules be partitioned per process at all?
//
// Attempted: joules = a*P_core_seconds + b*E_core_seconds, least squares
// through the origin. It FAILS on this hardware, and the failure is the
// finding: total SoC power sits near-constant (13.5-18 W) whichever framework
// is saturating the machine, so energy is not proportional to accumulated CPU
// time. elysia/ping accumulates 1.9x the P-core time and 38x the E-core time
// of express/ping for 1.14x the energy. The fit answers with a negative E-core
// coefficient, which would mean E-core work releases energy.
//
// So we do NOT publish a per-process joule split. We report the thing that is
// actually measured -- share of CPU time -- and record the failed fit as
// evidence for why.
// ---------------------------------------------------------------------------
const A = windows.map((w) => [w.totalP / 1e9, w.totalE / 1e9])
const y = windows.map((w) => w.joules)
const s11 = A.reduce((s, r) => s + r[0] * r[0], 0)
const s12 = A.reduce((s, r) => s + r[0] * r[1], 0)
const s22 = A.reduce((s, r) => s + r[1] * r[1], 0)
const sy1 = A.reduce((s, r, i) => s + r[0] * y[i], 0)
const sy2 = A.reduce((s, r, i) => s + r[1] * y[i], 0)
const det = s11 * s22 - s12 * s12
const a = det ? (sy1 * s22 - sy2 * s12) / det : 0
const b = det ? (sy2 * s11 - sy1 * s12) / det : 0
const pred = A.map((r) => a * r[0] + b * r[1])
const ybar = y.reduce((s, v) => s + v, 0) / y.length
const ssRes = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0)
const ssTot = y.reduce((s, v) => s + (v - ybar) ** 2, 0)
const r2 = ssTot ? 1 - ssRes / ssTot : 0

const round = (x: number, d = 4) => Number(x.toFixed(d))
/**
 * DEAD_TASKS is powermetrics' bucket for processes that exited during a sample.
 * It is 16-38% of in-window CPU time here and correlates with the framework
 * under test, so it is emphatically not background noise and must not be
 * folded into "other" -- it is an explicit ceiling on how precisely any of
 * this can be attributed.
 */
const KEEP = ['server', 'bombardier', 'kernel_task', 'DEAD_TASKS', 'powermetrics', 'WindowServer']

const out = windows.map((w) => {
	const rows = [...w.byProc.entries()].map(([name, v]) => ({
		name,
		pNs: v.pNs,
		eNs: v.eNs,
		cpuNs: v.pNs + v.eNs,
		impact: v.impact
	}))
	const named = rows.filter((r) => KEEP.includes(r.name))
	const rest = rows.filter((r) => !KEEP.includes(r.name))
	const agg = [
		...KEEP.map((k) => named.find((r) => r.name === k) ?? { name: k, pNs: 0, eNs: 0, cpuNs: 0, impact: 0 }),
		{
			name: 'other',
			pNs: rest.reduce((s, r) => s + r.pNs, 0),
			eNs: rest.reduce((s, r) => s + r.eNs, 0),
			cpuNs: rest.reduce((s, r) => s + r.cpuNs, 0),
			impact: rest.reduce((s, r) => s + r.impact, 0)
		}
	]
	const totCpu = agg.reduce((s, r) => s + r.cpuNs, 0)
	const totP = agg.reduce((s, r) => s + r.pNs, 0)
	const totImpact = agg.reduce((s, r) => s + r.impact, 0)

	return {
		framework: w.framework,
		route: w.route,
		windowJ: round(w.joules, 3),
		meanWatts: round(w.joules / ((w.endMs - w.startMs) / 1000), 3),
		buckets: agg.map((r) => ({
			name: r.name,
			cpuMs: round(r.cpuNs / 1e6, 1),
			pCoreMs: round(r.pNs / 1e6, 1),
			cpuTimeShare: round(totCpu ? r.cpuNs / totCpu : 0, 4),
			pCoreTimeShare: round(totP ? r.pNs / totP : 0, 4),
			energyImpactShare: round(totImpact ? r.impact / totImpact : 0, 4)
		}))
	}
})

const attribution = {
	metric: 'share of CPU time (and of P-core time) during each 10s load window',
	unattributable:
		'DEAD_TASKS is CPU time from processes that exited mid-sample and cannot be attributed to any surviving process. It is 16-38% of in-window CPU time and varies with the framework under test, so every share below should be read as a bound rather than a point estimate.',
	sessionId: OUT.split('/').pop(),
	whyNotJoules:
		'Per-process joules are not reported. Total SoC power is near-constant at saturation regardless of accumulated CPU time, so energy is not proportional to CPU time: a least-squares fit of joules against P-core and E-core seconds returns a negative E-core coefficient (physically impossible) with poor fit. The numbers below are CPU-time shares, which is what the tasks sampler actually measures.',
	failedJouleFit: {
		model: 'joules = a*P_core_seconds + b*E_core_seconds, through origin',
		joulesPerPCoreSecond: round(a, 4),
		joulesPerECoreSecond: round(b, 4),
		r2: round(r2, 4),
		windows: windows.length,
		rejected: true,
		reason: 'negative E-core coefficient'
	},
	caveat:
		"energyImpactShare is Apple's unitless Energy Impact heuristic, shown only as a cross-check; it is not joules.",
	windows: out
}

console.log(`windows: ${windows.length}`)
console.log(
	`REJECTED joule fit: P=${attribution.failedJouleFit.joulesPerPCoreSecond} E=${attribution.failedJouleFit.joulesPerECoreSecond} R2=${attribution.failedJouleFit.r2}`,
)
console.log('')
console.log('CPU-time share:')
for (const w of out) {
	const s = w.buckets
		.filter((b) => b.cpuTimeShare >= 0.01)
		.map((b) => `${b.name} ${(b.cpuTimeShare * 100).toFixed(0)}%`)
		.join('  ')
	console.log(`  ${w.framework.padEnd(8)} ${w.route.padEnd(6)} ${String(w.meanWatts).padStart(6)}W  ${s}`)
}

if (MERGE) {
	const j = JSON.parse(readFileSync(MERGE, 'utf8'))
	j.attribution = attribution
	writeFileSync(MERGE, JSON.stringify(j, null, '\t') + '\n')
	console.log(`\nmerged into ${MERGE}`)
}
