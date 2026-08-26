# Energy benchmark harness

The measurement code behind [What a request costs in joules](https://blog.icerust.dev/blog/energy-per-request-on-m5-air/).

These files sit alongside a clone of
[saltyaom/bun-http-framework-benchmark](https://github.com/saltyaom/bun-http-framework-benchmark)
pinned at `383eddd`, in a directory named `energy/` at the clone root.
**Upstream is not modified** — `runner.ts` imports `bench.ts`'s exported
functions (`startServer`, `waitForStartup`, `validateServer`, `ensurePortFree`,
`buildBenchmarkArgs`) and drives the benchmark through upstream's own code
paths, asserting the generated bombardier argv character-for-character before a
session starts.

| File | Purpose |
| --- | --- |
| `preflight.sh` | Read-only machine checks; writes `meta.json`; non-zero exit blocks the run |
| `session.sh` | Orchestrates one session; prints the powermetrics command for the other tab |
| `runner.ts` | Latin-square ordering, cooldowns, per-route timestamps, both PIDs, resumable JSONL |
| `plist.ts` | NUL-separated XML plist parser for powermetrics output |
| `analyze.ts` | Energy integration, idle baselines, aggregates, validation → the post's data file |
| `attribute.ts` | Per-process CPU-time shares, and the rejected joules regression |
| `inspect-plist.ts` | Dumps a capture's key set — run this before trusting any parser |
| `RESUME.md` | Operational runbook with the exact commands |

The resulting dataset is `../src/data/energy-benchmark-m5.json`: all 25
measurements, 26 idle windows, the power trace, the validation statistics and
the attribution pass, including the regression that failed.

## Gotchas worth knowing before you copy this

- `powermetrics`' `timestamp` has **one-second resolution** while `elapsed_ns`
  is precise. Aligning short windows against it is a real error — see
  `analyze.ts`'s `loadSamples`.
- `--show-plimits` adds **no keys** to plist output on macOS 26.6.2.
- macOS 26 names the performance cluster **`S-Cluster`**, not `P-Cluster`.
- bombardier emits percentiles for `rps` only, not `latency`.
