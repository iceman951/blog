#!/usr/bin/env bun
/**
 * Turns a session's timeline.jsonl + power.plist* into the blog's data file.
 *
 * Energy field is auto-detected: powermetrics exposes per-sample *_energy
 * accumulators (mJ) on some macOS builds and only *_power (mW) on others, and
 * the key names move between releases. We prefer the accumulators — they are
 * the true integral over the real sample window — and fall back to
 * power x elapsed_ns, recording which path was taken.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { readSamples } from './plist.ts'

const argv = Bun.argv.slice(2)
const flag = (n: string, d = '') => {
	const i = argv.indexOf(`--${n}`)
	return i === -1 ? d : argv[i + 1]
}

const OUT = flag('out')
if (!OUT) throw new Error('--out <sessiondir> is required')
const DEST = flag('dest', '')

// ------------------------------------------------------------ power samples

type Sample = {
	startMs: number
	endMs: number
	joules: number
	watts: number
	/**
	 * --show-plimits adds NO keys in plist format (verified on macOS 26.6.2), so
	 * there is no CPU speed limit to read. Cluster frequency is the throttling
	 * proxy instead: a P-cluster that drifts down across the session is the
	 * signal pmset -g therm refuses to give.
	 */
	pClusterHz: number | null
	eClusterHz: number | null
	thermalPressure: string | null
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Walk a nested dict for the first occurrence of a key. */
const dig = (obj: unknown, key: string): unknown => {
	if (!obj || typeof obj !== 'object') return undefined
	const rec = obj as Record<string, unknown>
	if (key in rec) return rec[key]
	for (const v of Object.values(rec)) {
		if (v && typeof v === 'object') {
			const hit = dig(v, key)
			if (hit !== undefined) return hit
		}
	}
	return undefined
}

let energyPath: 'counters' | 'power' | null = null

const loadSamples = async (dir: string): Promise<Sample[]> => {
	const files = readdirSync(dir)
		.filter((f) => f.startsWith('power.plist'))
		.sort()
	if (!files.length) throw new Error(`no power.plist* in ${dir}`)

	const out: Sample[] = []
	for (const file of files) {
		/**
		 * powermetrics' `timestamp` is truncated to whole seconds — consecutive
		 * samples share one, then jump 1000ms — while `elapsed_ns` is precise to
		 * the sub-millisecond. Aligning 10s load windows against a 1s clock would
		 * put up to a second of the wrong power in every window.
		 *
		 * So we rebuild a precise time axis from the cumulative elapsed_ns and
		 * anchor it to the coarse timestamps by least squares (+500ms to undo the
		 * truncation bias). Fitting the slope too absorbs any drift between
		 * powermetrics' timer and the wall clock the runner stamped its windows
		 * with. Each file is fitted separately, since a resumed session restarts
		 * the sampler.
		 */
		const raw: { ts: number; elapsedS: number; sample: Omit<Sample, 'startMs' | 'endMs'> }[] = []
		for (const s of await readSamples(`${dir}/${file}`)) {
			const ts = s.timestamp instanceof Date ? s.timestamp.getTime() : Number(s.timestamp)
			const elapsedNs = num(dig(s, 'elapsed_ns')) ?? 0
			const elapsedS = elapsedNs / 1e9
			if (!Number.isFinite(ts) || elapsedS <= 0) continue

			const cpuE = num(dig(s, 'cpu_energy'))
			const gpuE = num(dig(s, 'gpu_energy'))
			const aneE = num(dig(s, 'ane_energy'))

			let joules: number | null = null
			if (cpuE !== null) {
				// Accumulators are millijoules over the sample window.
				joules = (cpuE + (gpuE ?? 0) + (aneE ?? 0)) / 1000
				energyPath ??= 'counters'
			} else {
				const mW = num(dig(s, 'combined_power')) ?? num(dig(s, 'cpu_power'))
				if (mW === null) continue
				joules = (mW / 1000) * elapsedS
				energyPath ??= 'power'
			}

			const clusters = (dig(s, 'clusters') ?? []) as Record<string, unknown>[]
			const clusterHz = (prefix: string) => {
				const c = clusters.find((x) => String(x.name ?? '').startsWith(prefix))
				return c ? num(c.freq_hz) : null
			}
			const pressure = dig(s, 'thermal_pressure')

			raw.push({
				ts,
				elapsedS,
				sample: {
					joules,
					watts: joules / elapsedS,
					// macOS 26 names the performance cluster "S-Cluster" (Super),
					// not "P-Cluster".
					pClusterHz: clusterHz('S'),
					eClusterHz: clusterHz('E'),
					thermalPressure: typeof pressure === 'string' ? pressure : null
				}
			})
		}

		if (!raw.length) continue

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

		raw.forEach((r, i) => {
			const endMs = intercept + slope * cum[i]
			out.push({ ...r.sample, startMs: endMs - r.elapsedS * 1000 * slope, endMs })
		})
	}
	return out.sort((a, b) => a.startMs - b.startMs)
}

// ------------------------------------------------- fractional-overlap integral

const integrate = (samples: Sample[], t0: number, t1: number) => {
	let joules = 0
	let covered = 0
	let n = 0
	let pHzSum = 0
	let pHzN = 0
	let pressure: string | null = null

	for (const s of samples) {
		if (s.endMs <= t0 || s.startMs >= t1) continue
		const span = s.endMs - s.startMs
		const overlap = Math.max(0, Math.min(t1, s.endMs) - Math.max(t0, s.startMs))
		if (overlap <= 0) continue
		const w = overlap / span
		joules += w * s.joules
		covered += overlap
		n++
		if (s.pClusterHz) {
			pHzSum += s.pClusterHz
			pHzN++
		}
		if (s.thermalPressure && s.thermalPressure !== 'Nominal') pressure = s.thermalPressure
	}

	const seconds = (t1 - t0) / 1000
	return {
		joules,
		seconds,
		meanWatts: joules / seconds,
		samples: n,
		coverage: covered / (t1 - t0),
		pClusterMHz: pHzN ? Math.round(pHzSum / pHzN / 1e6) : null,
		thermalPressure: pressure ?? 'Nominal'
	}
}

// ----------------------------------------------------------------- statistics

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = (xs: number[]) => {
	if (xs.length < 2) return 0
	const m = mean(xs)
	return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))
}
const pearson = (xs: number[], ys: number[]) => {
	const mx = mean(xs)
	const my = mean(ys)
	const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0)
	const dx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0))
	const dy = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0))
	return dx && dy ? cov / (dx * dy) : 0
}
const rank = (xs: number[]) => {
	const order = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0])
	const r = new Array(xs.length).fill(0)
	order.forEach(([, i], k) => (r[i as number] = k + 1))
	return r
}
const spearman = (xs: number[], ys: number[]) => pearson(rank(xs), rank(ys))
const round = (x: number, d = 4) => Number(x.toFixed(d))

// ----------------------------------------------------------------------- main

const timeline = readFileSync(`${OUT}/timeline.jsonl`, 'utf8')
	.split('\n')
	.filter((l) => l.trim())
	.map((l) => JSON.parse(l))

const samples = await loadSamples(OUT)
console.log(`power samples: ${samples.length} (energy path: ${energyPath})`)

const meta = existsSync(`${OUT}/meta.json`) ? JSON.parse(readFileSync(`${OUT}/meta.json`, 'utf8')) : {}

// idle windows: integrate the trailing quiet part of each cooldown
const idleWindows = timeline
	.filter((r) => r.event === 'idleWindow')
	.map((r) => {
		const t0 = r.baselineStartMs
		const t1 = Math.min(r.baselineEndMs, r.endedAtMs)
		const stats = integrate(samples, t0, t1)
		return {
			id: r.id,
			index: r.index,
			kind: r.kind,
			startedAtMs: r.startedAtMs,
			endedAtMs: r.endedAtMs,
			sessionMinute: 0, // filled once sessionStartMs is known

			meanWatts: round(stats.meanWatts, 3),
			samples: stats.samples,
			coverage: round(stats.coverage, 3),
			followsMeasurementId: r.followsMeasurementId,
			precedesMeasurementId: r.precedesMeasurementId
		}
	})

const idleFor = (measurementId: string) => {
	const preceding = idleWindows.filter((w) => w.precedesMeasurementId === measurementId)
	return preceding.length ? preceding[preceding.length - 1] : idleWindows[0]
}

const sessionStartMs = Math.min(...timeline.map((r) => r.ts))
for (const w of idleWindows) w.sessionMinute = round((w.startedAtMs - sessionStartMs) / 60000, 2)

const measurements = timeline
	.filter((r) => r.event === 'measurementComplete')
	.map((r) => {
		const idle = idleFor(r.id)
		const routes: Record<string, unknown> = {}

		for (const [route, raw] of Object.entries(r.routes as Record<string, any>)) {
			const w = integrate(samples, raw.startedAtMs, raw.endedAtMs)
			const idleWatts = idle?.meanWatts ?? 0
			const netJ = w.joules - idleWatts * w.seconds
			const mb = raw.bytesRead ? raw.bytesRead / 1e6 : null

			routes[route] = {
				startedAtMs: raw.startedAtMs,
				endedAtMs: raw.endedAtMs,
				bombardierPid: raw.bombardierPid,
				requests: raw.requests,
				req2xx: raw.req2xx,
				others: raw.others,
				timeTakenSeconds: raw.timeTakenSeconds,
				rpsMean: round(raw.rpsMean, 1),
				rpsStddev: round(raw.rpsStddev, 1),
				latencyMeanUs: round(raw.latencyMeanUs, 1),
				latencyMaxUs: raw.latencyMaxUs,
				bytesRead: raw.bytesRead,
				energyJ: round(w.joules, 3),
				meanWatts: round(w.meanWatts, 3),
				powerSamples: w.samples,
				powerCoverage: round(w.coverage, 3),
				idleWindowId: idle?.id ?? null,
				idleWatts: round(idleWatts, 3),
				netEnergyJ: round(netJ, 3),
				idleShare: round((idleWatts * w.seconds) / w.joules, 4),
				mjPerReq: round((w.joules * 1000) / raw.requests, 5),
				netMjPerReq: round((netJ * 1000) / raw.requests, 5),
				mjPerMB: mb ? round((w.joules * 1000) / mb, 3) : null,
				pClusterMHz: w.pClusterMHz,
				thermalPressure: w.thermalPressure
			}
		}

		return {
			id: r.id,
			arm: r.arm,
			round: r.round,
			slot: r.slot,
			framework: r.framework,
			target: r.target,
			sessionMinute: round((r.startedAtMs - sessionStartMs) / 60000, 2),
			serverPid: r.serverPid,
			startupMs: round(r.startupMs, 1),
			rssBeforeBytes: r.rssBeforeBytes,
			rssAfterBytes: r.rssAfterBytes,
			startedAtMs: r.startedAtMs,
			endedAtMs: r.endedAtMs,
			routes
		}
	})

// ------------------------------------------------------------------ aggregates

const frameworks = [...new Set(measurements.map((m) => m.framework))]
const routeNames = [...new Set(measurements.flatMap((m) => Object.keys(m.routes)))]
const SMALL_ROUTES = routeNames.filter((r) => r !== 'video')

const byFramework: Record<string, unknown> = {}
for (const fw of frameworks) {
	const mine = measurements.filter((m) => m.framework === fw)
	const byRoute: Record<string, unknown> = {}

	for (const route of routeNames) {
		const rows = mine.map((m) => m.routes[route] as any).filter(Boolean)
		if (!rows.length) continue
		const mj = rows.map((r) => r.mjPerReq)
		byRoute[route] = {
			n: rows.length,
			meanMjPerReq: round(mean(mj), 5),
			sdMjPerReq: round(sd(mj), 5),
			cvMjPerReq: round(sd(mj) / mean(mj), 4),
			minMjPerReq: round(Math.min(...mj), 5),
			maxMjPerReq: round(Math.max(...mj), 5),
			meanNetMjPerReq: round(mean(rows.map((r) => r.netMjPerReq)), 5),
			meanRps: round(mean(rows.map((r) => r.rpsMean)), 1),
			sdRps: round(sd(rows.map((r) => r.rpsMean)), 1),
			meanWatts: round(mean(rows.map((r) => r.meanWatts)), 3),
			sdWatts: round(sd(rows.map((r) => r.meanWatts)), 3),
			meanIdleShare: round(mean(rows.map((r) => r.idleShare)), 4),
			meanMjPerMB: rows[0].mjPerMB === null ? null : round(mean(rows.map((r) => r.mjPerMB)), 3)
		}
	}

	// Request-weighted across the small routes; an unweighted mean would just be
	// the video number in disguise (video does ~200x fewer requests).
	const weighted = mine.map((m) => {
		const rows = SMALL_ROUTES.map((r) => m.routes[r] as any).filter(Boolean)
		const j = rows.reduce((a, r) => a + r.energyJ, 0)
		const req = rows.reduce((a, r) => a + r.requests, 0)
		return { mj: (j * 1000) / req, rps: mean(rows.map((r) => r.rpsMean)), watts: mean(rows.map((r) => r.meanWatts)) }
	})

	byFramework[fw] = {
		byRoute,
		weightedSmallRoutes: {
			meanMjPerReq: round(mean(weighted.map((w) => w.mj)), 5),
			sdMjPerReq: round(sd(weighted.map((w) => w.mj)), 5),
			cv: round(sd(weighted.map((w) => w.mj)) / mean(weighted.map((w) => w.mj)), 4),
			meanRps: round(mean(weighted.map((w) => w.rps)), 1),
			meanWatts: round(mean(weighted.map((w) => w.watts)), 3)
		}
	}
}

// ----------------------------------------------------------------- validation

const points = measurements.flatMap((m) =>
	SMALL_ROUTES.map((route) => {
		const r = m.routes[route] as any
		if (!r) return null
		const fwMean = (byFramework[m.framework] as any).byRoute[route].meanMjPerReq
		return { slot: m.slot, minute: m.sessionMinute, norm: r.mjPerReq / fwMean, rps: r.rpsMean, watts: r.meanWatts }
	}).filter(Boolean),
) as { slot: number; minute: number; norm: number; rps: number; watts: number }[]

const seR = 1 / Math.sqrt(Math.max(points.length - 3, 1))
const rSlot = pearson(points.map((p) => p.norm), points.map((p) => p.slot))

const meanNormalisedBySlot = [1, 2, 3, 4, 5].map((slot) => {
	const xs = points.filter((p) => p.slot === slot).map((p) => p.norm)
	return xs.length ? round(mean(xs), 4) : null
})

// Is mJ/req just watts/rps? If watts are flat, this r^2 approaches 1 and the
// whole result is an algebraic restatement of throughput.
const invThroughput = points.map((p) => 1 / p.rps)
const rInv = pearson(points.map((p) => p.norm * 0 + p.watts / p.rps), invThroughput)

const idleSlope = (() => {
	if (idleWindows.length < 2) return null
	const xs = idleWindows.map((w) => (w.startedAtMs - sessionStartMs) / 3.6e6)
	const ys = idleWindows.map((w) => w.meanWatts)
	const mx = mean(xs)
	const my = mean(ys)
	const denom = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
	return denom ? round(xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / denom, 4) : null
})()

/**
 * Per-sample watts inside one representative 10s ping window, for the line
 * chart. Taken from the middle round so it is neither the coldest nor the
 * hottest part of the session.
 */
const traceRound = 3
const powerTrace = {
	note: 'one representative ping window per framework, from the middle round',
	round: traceRound,
	route: 'ping',
	intervalMs: 500,
	series: Object.fromEntries(
		['elysia', 'express'].map((fw) => {
			const m = measurements.find((x) => x.framework === fw && x.round === traceRound)
			const r = m?.routes.ping as any
			if (!r) return [fw, []]
			return [
				fw,
				samples
					// midpoint inside the window: an edge sample that mostly covers
					// pre-load idle would otherwise plot as a misleading dip
					.filter((s) => {
						const mid = (s.startMs + s.endMs) / 2
						return mid >= r.startedAtMs && mid <= r.endedAtMs
					})
					.map((s) => ({
						tMs: Math.round((s.startMs + s.endMs) / 2 - r.startedAtMs),
						watts: round(s.watts, 3)
					}))
			]
		}),
	)
}

const data = {
	schemaVersion: 1,
	generatedAt: new Date().toISOString(),
	sessions: [{ id: OUT.split('/').pop(), arm: measurements[0]?.arm ?? 'saturated', roomTempC: meta.roomTempC ?? 21 }],
	machine: meta.machine ?? null,
	tools: {
		...(meta.tools ?? {}),
		upstream: meta.upstream ?? null,
		powermetrics: {
			intervalMs: 500,
			samplers: ['cpu_power', 'thermal'],
			flags: ['-a 0', '-b 0', '--handle-invalid-values'],
			plimitsOmitted: '--show-plimits adds no keys in plist output on macOS 26.6.2, so it was dropped',
			energyField: energyPath === 'counters' ? 'cpu_energy+gpu_energy+ane_energy' : 'combined_power x elapsed_ns',
			fallbackUsed: energyPath === 'power'
		},
		deviations: [
			'bombardier invoked with -p r -o json (suppresses progress bar).',
			'2s fixed gap inserted between routes (upstream runs them back to back).',
			'Frameworks built once before the session rather than per invocation.',
			'Runner is a new file importing bench.ts exports; bench.ts unmodified.'
		]
	},
	methodology: {
		rounds: Math.max(...measurements.map((m) => m.round)),
		totalMeasurements: measurements.length,
		cooldownSec: 120,
		interRouteGapSec: 2,
		orderingScheme: 'cyclic 5x5 Latin square',
		idleWindow: { source: 'cooldown', offsetSec: 62, endOffsetSec: 118, count: idleWindows.length },
		integration: 'fractional-overlap weighting on sample [timestamp-elapsed_ns, timestamp]',
		headlineMetric: 'request-weighted mJ/req over ping+query+body; video reported as mJ/MB'
	},
	caveats: [
		'Power is SoC compute only: excludes DRAM, SoC fabric, display, SSD, Wi-Fi, PMU/VRM and adapter losses.',
		"powermetrics values are Apple's estimates; per its own help text they must not be used to compare devices.",
		'bombardier shares the same 10 cores as the server.',
		'Net is energy above a warm idle floor, not "the framework\'s energy".',
		'Error bars are +/-1 SD, not confidence intervals.'
	],
	measurements,
	idleWindows,
	powerTrace,
	aggregates: {
		byFramework,
		rankings: {
			byMjPerReq: [...frameworks].sort(
				(a, b) =>
					(byFramework[a] as any).weightedSmallRoutes.meanMjPerReq -
					(byFramework[b] as any).weightedSmallRoutes.meanMjPerReq,
			),
			byMeanWatts: [...frameworks].sort(
				(a, b) => (byFramework[b] as any).weightedSmallRoutes.meanWatts - (byFramework[a] as any).weightedSmallRoutes.meanWatts,
			)
		}
	},
	validation: {
		positionBias: {
			metric: 'gross mJ/req per route, normalised to framework mean',
			n: points.length,
			pearsonR: round(rSlot, 3),
			spearmanRho: round(spearman(points.map((p) => p.norm), points.map((p) => p.slot)), 3),
			seR: round(seR, 3),
			significantAt95: Math.abs(rSlot) > 1.96 * seR,
			meanNormalisedBySlot,
			note: 'A cyclic Latin square cancels any linear slot effect by construction; this tests residual drift.'
		},
		sessionTimeDrift: {
			pearsonR: round(pearson(points.map((p) => p.norm), points.map((p) => p.minute)), 3)
		},
		idleDrift: {
			firstWatts: idleWindows[0]?.meanWatts ?? null,
			lastWatts: idleWindows[idleWindows.length - 1]?.meanWatts ?? null,
			slopeWattsPerHour: idleSlope
		},
		energyVsInverseThroughput: {
			r2: round(rInv ** 2, 3),
			note: 'If r2 is near 1, mJ/req is a restatement of 1/rps on a saturated machine.'
		}
	},
	integrity: {
		pmsetThermBefore: meta.pmsetThermBefore ?? null,
		energyPath,
		plimitsAvailable: false,
		plimitsNote:
			'--show-plimits adds no keys in plist format on macOS 26.6.2; P-cluster frequency is used as the throttling proxy instead.',
		nonNominalThermalWindows: measurements.flatMap((m) =>
			Object.entries(m.routes)
				.filter(([, r]) => (r as any).thermalPressure !== 'Nominal')
				.map(([route]) => `${m.id}/${route}`),
		),
		lowCoverageWindows: measurements.flatMap((m) =>
			Object.entries(m.routes)
				.filter(([, r]) => (r as any).powerCoverage < 0.95)
				.map(([route]) => `${m.id}/${route}`),
		)
	}
}

const dest = DEST || `${OUT}/energy-benchmark-m5.json`
writeFileSync(dest, JSON.stringify(data, null, '\t') + '\n')
console.log(`wrote ${dest}`)
console.log(`  frameworks: ${frameworks.join(', ')}`)
console.log(`  measurements: ${measurements.length}, idle windows: ${idleWindows.length}`)
console.log(`  energy path: ${energyPath}`)
console.log(`  watts spread: ${frameworks.map((f) => `${f} ${(byFramework[f] as any).weightedSmallRoutes.meanWatts}W`).join('  ')}`)
console.log(`  energyVsInverseThroughput r2: ${data.validation.energyVsInverseThroughput.r2}`)
