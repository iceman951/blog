#!/usr/bin/env bun
/**
 * Energy-per-request runner.
 *
 * Drives SaltyAom's bun-http-framework-benchmark WITHOUT modifying bench.ts:
 * every server boot, validation and bombardier argv comes from bench.ts's own
 * exported functions, so flag fidelity is guaranteed by construction.
 *
 * Deviations from upstream (all disclosed in the post):
 *   1. bombardier gains `-p r -o json` (no progress bar, machine-readable out)
 *   2. a fixed 2s gap between routes, so power windows are separable
 *   3. frameworks are pre-built, so Bun.build energy is outside every window
 *   4. upstream's main() never runs, so results/ is never wiped
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import {
	buildBenchmarkArgs,
	ensurePortFree,
	startServer,
	validateServer,
	waitForStartup
} from '../bench.ts'

// ---------------------------------------------------------------- constants

const baseUrl = 'http://127.0.0.1:3000'

/** Verbatim copy of upstream's `benchmarks` array (it is const, not exported). */
const benchmarks = [
	{ name: 'Ping', args: [`${baseUrl}/`] },
	{ name: 'Query', args: [`${baseUrl}/id/1?name=bun`] },
	{
		name: 'Body',
		args: [
			'-m',
			'POST',
			'-H',
			'Content-Type:application/json',
			'-f',
			'./scripts/body.json',
			`${baseUrl}/json`
		]
	},
	{
		name: 'Video',
		connections: 10,
		args: [
			'-H',
			'Cache-Control:no-store',
			'-H',
			'If-None-Match:"benchmark-force-full-response"',
			`${baseUrl}/video`
		]
	}
] as const

const ROUTE_KEY: Record<string, string> = {
	Ping: 'ping',
	Query: 'query',
	Body: 'body',
	Video: 'video'
}

/** Cyclic 5x5 Latin square: every framework occupies every slot exactly once. */
const LATIN_SQUARE = [
	['elysia', 'hono', 'bun', 'effect', 'express'],
	['hono', 'bun', 'effect', 'express', 'elysia'],
	['bun', 'effect', 'express', 'elysia', 'hono'],
	['effect', 'express', 'elysia', 'hono', 'bun'],
	['express', 'elysia', 'hono', 'bun', 'effect']
] as const

/** Upstream's argv, character-for-character, asserted at startup when rps=0. */
const EXPECTED_ARGV = [
	'--fasthttp -c 500 -d 10s http://127.0.0.1:3000/',
	'--fasthttp -c 500 -d 10s http://127.0.0.1:3000/id/1?name=bun',
	'--fasthttp -c 500 -d 10s -m POST -H Content-Type:application/json -f ./scripts/body.json http://127.0.0.1:3000/json',
	'--fasthttp -c 10 -d 10s -H Cache-Control:no-store -H If-None-Match:"benchmark-force-full-response" http://127.0.0.1:3000/video'
]

// --------------------------------------------------------------------- args

const argv = Bun.argv.slice(2)
const flag = (name: string, fallback: string) => {
	const i = argv.indexOf(`--${name}`)
	return i === -1 ? fallback : argv[i + 1]
}
const has = (name: string) => argv.includes(`--${name}`)

const OUT = flag('out', '')
if (!OUT) throw new Error('--out <dir> is required')

const ARM = flag('arm', 'saturated')
const RPS = Number(flag('rps', '0'))
const ROUNDS = Number(flag('rounds', '5'))
const COOLDOWN_SEC = Number(flag('cooldown', '120'))
const PREROLL_SEC = Number(flag('preroll', '120'))
const GAP_SEC = Number(flag('gap', '2'))
const FRAMEWORKS = flag('frameworks', '').split(',').filter(Boolean)
const ROUTES = flag('routes', '').split(',').filter(Boolean)
const SKIP_POWER_CHECK = has('no-power-check')

const timelineFile = `${OUT}/timeline.jsonl`
mkdirSync(`${OUT}/bombardier`, { recursive: true })

// ------------------------------------------------------------------ helpers

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const log = (record: Record<string, unknown>) => {
	appendFileSync(timelineFile, JSON.stringify({ ts: Date.now(), ...record }) + '\n')
}

const say = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`)

/** Newest power.plist* in OUT; the sampler must be alive and writing. */
const assertSamplerAlive = (context: string) => {
	if (SKIP_POWER_CHECK) return
	const files = readdirSync(OUT).filter((f) => f.startsWith('power.plist'))
	if (!files.length) throw new Error(`no power.plist in ${OUT} — is powermetrics running in tab A?`)
	const newest = Math.max(...files.map((f) => statSync(`${OUT}/${f}`).mtimeMs))
	const ageMs = Date.now() - newest
	if (ageMs > 5000)
		throw new Error(
			`powermetrics looks dead (${OUT} last written ${(ageMs / 1000).toFixed(1)}s ago) at ${context}. ` +
				`Halting rather than collecting unalignable data.`
		)
}

/** caffeinate must still be holding the sleep assertion. */
const assertNoSleep = async () => {
	const p = Bun.spawn({ cmd: ['pmset', '-g', 'assertions'], stdout: 'pipe' })
	const out = await new Response(p.stdout).text()
	await p.exited
	if (!/PreventUserIdleSystemSleep\s+1/.test(out))
		throw new Error('PreventUserIdleSystemSleep is not held — run under `caffeinate -dimsu`')
}

const memoryUsage = async (pid: number) => {
	const p = Bun.spawn({ cmd: ['ps', '-o', 'rss=', '-p', String(pid)], stdout: 'pipe', stderr: 'ignore' })
	const out = await new Response(p.stdout).text()
	await p.exited
	const kb = Number(out.trim())
	return Number.isFinite(kb) ? kb * 1024 : null
}

// -------------------------------------------------------------- bombardier

const runBombardier = async (
	args: string[],
	meta: { round: number; slot: number; framework: string; route: string }
) => {
	const cmd = ['bombardier', '-p', 'r', '-o', 'json', ...args]

	const startedAtMs = Date.now()
	const proc = Bun.spawn({ cmd, env: Bun.env, stdout: 'pipe', stderr: 'pipe' })
	const bombardierPid = proc.pid
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	])
	const endedAtMs = Date.now()

	if (code !== 0) throw new Error(`bombardier exited ${code}: ${stderr.trim()}`)

	const brace = stdout.indexOf('{')
	if (brace === -1) throw new Error(`bombardier produced no JSON: ${stdout.slice(0, 300)}`)
	const parsed = JSON.parse(stdout.slice(brace))
	const r = parsed.result

	const requests =
		(r.req1xx ?? 0) + (r.req2xx ?? 0) + (r.req3xx ?? 0) + (r.req4xx ?? 0) + (r.req5xx ?? 0) + (r.others ?? 0)

	// A framework returning 5xx under load must not earn a flattering energy number.
	if (r.req2xx !== requests || (r.others ?? 0) !== 0)
		throw new Error(
			`non-2xx responses on ${meta.framework}/${meta.route}: ` +
				`2xx=${r.req2xx} 4xx=${r.req4xx} 5xx=${r.req5xx} others=${r.others}`
		)

	const name = `r${meta.round}-s${meta.slot}-${meta.framework}-${meta.route}.json`
	writeFileSync(`${OUT}/bombardier/${name}`, JSON.stringify(parsed, null, '\t'))

	return {
		...meta,
		cmd: cmd.join(' '),
		bombardierPid,
		startedAtMs,
		endedAtMs,
		requests,
		req1xx: r.req1xx ?? 0,
		req2xx: r.req2xx ?? 0,
		req3xx: r.req3xx ?? 0,
		req4xx: r.req4xx ?? 0,
		req5xx: r.req5xx ?? 0,
		others: r.others ?? 0,
		timeTakenSeconds: r.timeTakenSeconds,
		rpsMean: r.rps?.mean,
		rpsStddev: r.rps?.stddev,
		rpsMax: r.rps?.max,
		latencyMeanUs: r.latency?.mean,
		latencyStddevUs: r.latency?.stddev,
		latencyMaxUs: r.latency?.max,
		// bombardier only emits percentiles for rps; latency percentiles would
		// need -l, which upstream does not pass.
		rpsP50: r.rps?.percentiles?.['50'],
		rpsP99: r.rps?.percentiles?.['99'],
		bytesRead: r.bytesRead,
		bytesWritten: r.bytesWritten
	}
}

// ------------------------------------------------------------ idle windows

let idleIndex = 0

const idleWindow = async (
	kind: 'preroll' | 'cooldown' | 'postroll',
	seconds: number,
	follows: string | null,
	precedes: string | null
) => {
	const id = `idle-${String(idleIndex).padStart(2, '0')}`
	const startedAtMs = Date.now()
	say(`idle ${id} (${kind}, ${seconds}s)`)
	log({ event: 'idleWindowStart', id, index: idleIndex, kind, startedAtMs, followsMeasurementId: follows })
	await sleep(seconds * 1000)
	const endedAtMs = Date.now()
	log({
		event: 'idleWindow',
		id,
		index: idleIndex,
		kind,
		startedAtMs,
		endedAtMs,
		// Trailing portion of the window only: the first half carries server
		// teardown, page-cache writeback and the DVFS ramp-down. For the spec'd
		// 120s cooldown this is [start+62s, start+118s]; shorter windows scale.
		baselineStartMs: startedAtMs + Math.max(2000, seconds * 1000 * 0.52),
		baselineEndMs: startedAtMs + seconds * 1000 - 2000,
		followsMeasurementId: follows,
		precedesMeasurementId: precedes
	})
	idleIndex++
	return id
}

// ------------------------------------------------------------- measurement

const measure = async (round: number, slot: number, framework: string) => {
	const target = `bun/${framework}`
	const id = `r${round}-s${slot}-${framework}`
	say(`measure ${id}`)

	assertSamplerAlive(id)
	await assertNoSleep()
	await ensurePortFree()

	const server = startServer(target, true)
	const { response, startupMs } = await waitForStartup(server.startedAt)
	await validateServer(response)

	const rssBefore = await memoryUsage(server.pid)
	const startedAtMs = Date.now()
	log({ event: 'measurementStart', id, round, slot, framework, target, serverPid: server.pid, startupMs, startedAtMs })

	const routes: Record<string, unknown> = {}
	const selected = benchmarks.filter((b) => !ROUTES.length || ROUTES.includes(ROUTE_KEY[b.name]))

	for (const [i, bench] of selected.entries()) {
		const route = ROUTE_KEY[bench.name]
		const conns = 'connections' in bench ? (bench as { connections: number }).connections : undefined
		const args = buildBenchmarkArgs(bench.args, RPS, conns)
		const result = await runBombardier(args, { round, slot, framework, route })
		routes[route] = result
		log({ event: 'routeComplete', id, ...result })
		if (i < selected.length - 1) await sleep(GAP_SEC * 1000)
	}

	const rssAfter = await memoryUsage(server.pid)
	await server.stop()
	const endedAtMs = Date.now()

	log({
		event: 'measurementComplete',
		id,
		arm: ARM,
		round,
		slot,
		framework,
		target,
		serverPid: server.pid,
		startupMs,
		rssBeforeBytes: rssBefore,
		rssAfterBytes: rssAfter,
		startedAtMs,
		endedAtMs,
		routes
	})

	return id
}

// -------------------------------------------------------------------- main

const main = async () => {
	// Flag fidelity: prove our argv is upstream's argv before spending 75 minutes.
	if (RPS === 0) {
		const actual = benchmarks.map((b) =>
			buildBenchmarkArgs(b.args, 0, 'connections' in b ? (b as { connections: number }).connections : undefined).join(' ')
		)
		actual.forEach((line, i) => {
			if (line !== EXPECTED_ARGV[i])
				throw new Error(`argv drift on route ${i}:\n  got      ${line}\n  expected ${EXPECTED_ARGV[i]}`)
		})
		say('argv matches upstream character-for-character')
	}

	// Resume: skip {round,slot} pairs already completed.
	const done = new Set<string>()
	if (existsSync(timelineFile)) {
		for (const line of readFileSync(timelineFile, 'utf8').split('\n')) {
			if (!line.trim()) continue
			const rec = JSON.parse(line)
			if (rec.event === 'measurementComplete') done.add(`${rec.round}-${rec.slot}`)
		}
		if (done.size) {
			say(`resuming — ${done.size} measurement(s) already complete`)
			log({ event: 'sessionResumed', completed: [...done] })
		}
	}

	log({ event: 'sessionStart', arm: ARM, rps: RPS, rounds: ROUNDS, cooldownSec: COOLDOWN_SEC, gapSec: GAP_SEC })

	const heartbeat = setInterval(() => log({ event: 'heartbeat' }), 10_000)

	try {
		const plan: { round: number; slot: number; framework: string }[] = []
		for (let round = 1; round <= ROUNDS; round++)
			LATIN_SQUARE[(round - 1) % 5].forEach((framework, i) => {
				if (FRAMEWORKS.length && !FRAMEWORKS.includes(framework)) return
				plan.push({ round, slot: i + 1, framework })
			})

		const pending = plan.filter((p) => !done.has(`${p.round}-${p.slot}`))
		say(`${pending.length} measurement(s) to run`)

		let previous: string | null = null
		await idleWindow('preroll', PREROLL_SEC, null, pending[0] ? `r${pending[0].round}-s${pending[0].slot}-${pending[0].framework}` : null)

		for (const [i, p] of pending.entries()) {
			const id = await measure(p.round, p.slot, p.framework)
			previous = id
			const next = pending[i + 1]
			const isLast = i === pending.length - 1
			await idleWindow(
				isLast ? 'postroll' : 'cooldown',
				COOLDOWN_SEC,
				previous,
				next ? `r${next.round}-s${next.slot}-${next.framework}` : null
			)
		}

		log({ event: 'sessionEnd', ok: true })
		say('session complete')
	} finally {
		clearInterval(heartbeat)
	}
}

main().catch((error) => {
	log({ event: 'sessionEnd', ok: false, error: (error as Error).message })
	console.error(error)
	process.exitCode = 1
})
