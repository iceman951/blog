# Resume: energy-per-request measurement

Everything is built and smoke-tested. What remains is the 75-minute run itself,
the attribution pass, and writing the post.

## State

- Upstream clone pinned at `383edddc319e881b59888d985e3be639b3087f55`, **unmodified**
  (`git status --porcelain` shows only `?? energy/` and `?? out/` — this is the
  proof-of-no-patch the post relies on).
- All five targets pre-built into `dist/bun/*`.
- Harness in `energy/` is complete and validated end to end against real power data.
- A stale session dir `out/2026-08-25T1513-saturated/` exists with a `meta.json`
  captured while a browser was open. **Delete it and start fresh** — preflight must
  run at the real session's start.

## Run it

### 1. Quiet the machine

Close: browsers (Brave was at 2.7% and WindowServer at 8.9% during the last
preflight), editor, `astro dev stop`, Docker, Slack, Spotify, cloud sync.
Confirm AC, lid open, display brightness fixed, room 22 °C.

### 2. Create the session and run preflight

```sh
cd ~/bench/bun-http-framework-benchmark
MAIN="out/$(date +%Y-%m-%dT%H%M)-saturated"
mkdir -p "$MAIN/bombardier"
ROOM_TEMP_C=22 energy/preflight.sh "$MAIN"
```

It must print `preflight passed`. The `busy` line should show nothing above ~2%
apart from Terminal.

### 3. Tab A — the power stream (needs sudo, one password)

```sh
sudo powermetrics -i 500 -n 12000 -s cpu_power,thermal -a 0 -f plist -b 0 \
  -o "$PWD/$MAIN/power.plist" --handle-invalid-values
```

`-n 12000` = 100 minutes, then it self-terminates. That is deliberate: killing it
later would need a second sudo password after the 5-minute timestamp expires.
`--show-plimits` is **omitted on purpose** — see Findings.

Verify it is alive before continuing: the file should appear within a second and
grow at roughly 48 KB/s (expect ~300 MB total; 391 GB free).

### 4. Tab B — the runner (~75 min, unattended)

```sh
caffeinate -dimsu bun energy/runner.ts --out "$MAIN" --arm saturated
```

`caffeinate` is mandatory: AC sleep timer is 1 minute on this machine, and the
previous project lost a run to exactly that. The runner halts loudly if the
sampler dies or if the sleep assertion drops, and it is resumable — re-run the
same command and it skips completed `{round, slot}` pairs.

### 5. Attribution pass (~12 min, separate session)

```sh
ATTR="out/$(date +%Y-%m-%dT%H%M)-attrib"
mkdir -p "$ATTR/bombardier"
# Tab A:
sudo powermetrics -i 500 -n 1600 -s tasks,cpu_power,thermal \
  --show-process-energy --show-process-amp -a 0 -f plist -b 0 \
  -o "$PWD/$ATTR/power.plist" --handle-invalid-values
# Tab B:
caffeinate -dimsu bun energy/runner.ts --out "$ATTR" --arm attrib \
  --frameworks elysia,express --rounds 1 --cooldown 60
```

### 6. Analyze

```sh
bun energy/analyze.ts --out "$MAIN" \
  --dest ~/Desktop/github/blog/src/data/energy-benchmark-m5.json
```

## Findings from the smoke test — these belong in the post

1. **`timestamp` has 1-second resolution.** Consecutive samples share a timestamp,
   then jump 1000 ms, while `elapsed_ns` is precise to ~510 ms. Aligning 10 s
   windows against a 1 s clock is a real error: fixing it moved mean watts by ~4%
   and took window coverage from 1.009 to exactly 1.0. The analyzer rebuilds a
   precise time axis from cumulative `elapsed_ns`, anchored to the coarse
   timestamps by least squares (+500 ms to undo truncation bias).
2. **`--show-plimits` adds no keys in plist format** on macOS 26.6.2 — it only
   changes text output. There is no CPU-speed-limit or forced-idle field to read.
   The throttling proxy is per-cluster `freq_hz` plus `thermal_pressure`.
3. **The performance cluster is named `S-Cluster`** ("Super"), not `P-Cluster`,
   matching macOS 26's "4 Super and 6 Efficiency" naming.
4. **bombardier only emits percentiles for `rps`, not `latency`** — latency
   percentiles need `-l`, which upstream does not pass, so we do not either.
5. **The sampler perturbs the measurement.** Uninstrumented vs instrumented ping:
   elysia 199,639 → 196,647 (−1.5%), express 89,142 → 86,695 (−2.7%). Above the
   1% threshold originally set. Kept `-i 500` anyway because the cost is identical
   for every framework and therefore cancels in comparisons, and because idle
   subtraction removes it from the net figure — but the absolute mJ/req is
   inflated slightly and the post must say so.

## Gate result (already decided — no fixed-rate arm needed)

| | rps | watts | mJ/req | S-cluster |
|---|---|---|---|---|
| elysia | 196,647 | 16.71 | 0.0851 | 4201 MHz |
| express | 86,695 | 14.73 | 0.1701 | 4247 MHz |

Watts differ by 13.4%, far past the ~5% flatness threshold, so `mJ/req` is not
merely a restatement of `1/rps`. The headline shape: **express draws 12% less
power while being 2.27x slower, so it costs 2.00x the energy per request** — the
fastest framework is the hungriest, and the energy ratio is smaller than the
throughput ratio. Both clusters sit pinned near 4.2 GHz, so the power gap is
work-per-cycle and core engagement, not clock.

Treat these as smoke numbers (n=1); the real run supersedes them.
