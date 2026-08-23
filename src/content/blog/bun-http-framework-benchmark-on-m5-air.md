---
title: 'Benchmarking Bun HTTP frameworks on a MacBook Air M5'
description: 'I ran the bun-http-framework-benchmark suite five times on a fanless M5 Air and compared the means against the published desktop numbers. The gap is not where I expected it.'
pubDate: 'Aug 22 2026'
heroImage: '../../assets/bun-framework-throughput-m5.svg'
---

SaltyAom's [bun-http-framework-benchmark](https://github.com/saltyaom/bun-http-framework-benchmark) publishes its results from a desktop: an Intel Core i7-13700K with 32 GB of DDR5, running Linux. I don't have that machine. I have a MacBook Air — fanless, ARM, 10 cores, the laptop I actually write code on.

So the question I wanted answered was not "which framework is fastest." That's already published, and one more table confirming it isn't worth anyone's time. The question was: **how much of a desktop's throughput does a passively-cooled laptop actually give up?** I assumed the answer was a flat percentage. It isn't.

Everything below is the mean of **five full runs** of the suite. That turned out to matter — my first two runs disagreed about third place badly enough that publishing either one alone would have been misleading.

## The machine

| | |
| --- | --- |
| Model | MacBook Air (Mac17,3) |
| Chip | Apple M5 — 10 cores, 4 performance + 6 efficiency |
| Memory | 24 GB unified |
| OS | macOS 26.6.2 (25G83) |
| Bun | 1.4.0 |
| bombardier | 2.0.2 darwin/arm64 |
| Room temperature | 22 °C |

Run on AC power with the editor and dev server shut down, and `pmset -g therm` reporting no thermal or performance warnings before or after any run.

I'm listing the ambient temperature because on a fanless machine it's a real parameter, not trivia. This laptop has no fan to compensate for a warm room — its only options are to soak heat into the chassis and then throttle. At 22 °C it never had to. Run the same suite in a 32 °C room and I would not expect these numbers to hold.

## What the benchmark actually measures

Four routes, each hit by `bombardier --fasthttp` for 10 seconds at 500 concurrent connections — except the last, which has its own reason to be different:

- **Ping** — `GET /` returns `Hi` as `text/plain`. The floor: how cheap is one request/response cycle.
- **Query** — `GET /id/1?name=bun` returns `1 bun`. A path parameter and a query parameter, both extracted dynamically — the suite explicitly forbids hardcoded string indexing, so this measures the router and the query parser doing real work.
- **Body** — `POST /json` receives `{"hello":"world"}`, parses it to JSON, and serializes it back. Not an echo of bytes; a genuine round trip through the parser.
- **Video** — `GET /video` streams a 14.1 MB MP4. This one runs at 10 connections instead of 500, and sends `Cache-Control: no-store` with a deliberately non-matching `If-None-Match`, so the server can't shortcut with a 304. Every request moves the whole file.

Each framework also registers about twenty extra background routes that are never requested, so the router has a realistic table to search rather than a trivial one.

Before any load test, the harness boots the server and asserts every response body and header. A framework that returns the wrong thing doesn't get a number — it gets an error.

## Why Bun only

The upstream suite covers Bun, Node, and Deno. I ran only the Bun targets, because Bun is what I actually use. Node and Deno aren't installed on this machine and I had no reason to install them for this — "Bun versus Node" is a different question, and the upstream README already answers it. What I wanted was the comparison *within* Bun, on my hardware.

There's a trap here worth flagging for anyone repeating this on a Bun-only machine, though. I expected the Node targets to fail cleanly, and the Deno ones did — `Executable not found in $PATH: "deno"`. But most of the Node targets *started anyway*, because Bun transparently shims `node` for spawned child processes. Left alone, the run would have produced a full table of plausible-looking numbers labelled `node` that were really Bun executing a Node-targeted bundle.

That's a good feature and a terrible benchmark result. So: eight Bun targets, explicitly named.

```sh
bun benchmark bun/elysia bun/elysia-aot bun/hono bun/bun \
  bun/bun-web-standard bun/h3 bun/effect bun/express
```

`bun/fastify` exists in the source tree but sits on the upstream blacklist, so it stays out.

### Versions under test

A benchmark without version numbers has a shelf life of about a week, so:

| Target | Package | Version |
| --- | --- | --- |
| elysia | `elysia` | 2.0.0-beta.4 |
| elysia-aot | `elysia` via `elysia/plugin/aot/bun` | 2.0.0-beta.4 |
| hono | `hono` | 4.13.1 |
| bun | `Bun.serve` — no framework | Bun 1.4.0 |
| bun-web-standard | `Bun.serve`, Web-standard handler | Bun 1.4.0 |
| h3 | `h3` | 2.0.1-rc.26 |
| effect | `effect` + `@effect/platform-bun` | 4.0.0-beta.102 |
| express | `express` | 5.2.1 |

Worth noticing before you read anything into the ordering: **three of the eight are pre-release** — Elysia is on a beta, h3 on a release candidate, Effect on a beta. `elysia-aot` is not a separate package; it's the same Elysia build run through an ahead-of-time compile plugin, which is why the two rows track each other so closely. Both `bun` entries are the runtime itself rather than a dependency, so they version with Bun.

Numbers from pre-release software are a snapshot of a moving target. Elysia 2.0 in particular could look different by the time it ships.

## Results

Requests per second, averaged across the four routes, then averaged across five runs.

| Framework | Average | Ping | Query | Body | Video | Bundle | Startup | Memory after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| elysia | 136,966 | 199,500 | 179,867 | 167,653 | 846 | 171.4 KB | 11.7 ms | 56 MB |
| elysia-aot | 131,288 | 191,860 | 171,826 | 160,649 | 819 | 127.5 KB | 11.1 ms | 54 MB |
| bun | 123,131 | 166,591 | 169,924 | 155,205 | 804 | 2.3 KB | 6.2 ms | 52 MB |
| h3 | 121,272 | 171,532 | 159,520 | 153,240 | 794 | 22.5 KB | 8.1 ms | 60 MB |
| hono | 121,215 | 175,418 | 157,826 | 150,815 | 800 | 20.4 KB | 8.3 ms | 56 MB |
| bun-web-standard | 119,195 | 165,084 | 154,529 | 156,365 | 804 | 1.7 KB | 13.7 ms | 50 MB |
| effect | 91,875 | 140,386 | 125,018 | 101,320 | 777 | 263.2 KB | 29.5 ms | 79 MB |
| express | 55,156 | 80,755 | 73,227 | 66,328 | 313 | 822.8 KB | 32.6 ms | 220 MB |

## How much do these numbers move?

This is the part I'd skip if I were reading someone else's benchmark post, and it's the part that changed what I could honestly claim.

| Framework | Mean | Std dev | CV | Min | Max | Rank across runs |
| --- | ---: | ---: | ---: | ---: | ---: | :--- |
| elysia | 136,966 | 1,383 | 1.0% | 134,553 | 137,874 | 1 |
| elysia-aot | 131,288 | 2,217 | 1.7% | 128,251 | 134,385 | 2 |
| bun | 123,131 | 1,003 | 0.8% | 122,119 | 124,585 | 3–4 |
| h3 | 121,272 | 1,228 | 1.0% | 119,102 | 122,035 | 4–5 |
| hono | 121,215 | 3,092 | 2.6% | 115,970 | 124,111 | 3–6 |
| bun-web-standard | 119,195 | 1,418 | 1.2% | 117,554 | 121,202 | 5–6 |
| effect | 91,875 | 928 | 1.0% | 90,472 | 92,874 | 7 |
| express | 55,156 | 1,134 | 2.1% | 53,453 | 56,261 | 8 |

Run-to-run variation is about 1% for most frameworks, but hono is 2.6% and swung across four rank positions — in my second run it scored 115,970 and finished sixth; in my first it scored 122,427 and finished third. On two runs I'd have reported hono as either clearly third or clearly last-of-the-middle, and both would have been artefacts.

With five runs, here's what actually holds:

- **Elysia is first in every run**, and `elysia-aot` second in every run, both by margins several times the noise.
- **effect and express are seventh and eighth in every run**, and it isn't close.
- **h3 and hono are a dead tie** — 57 req/s apart on a base of 121,000. There is no ordering between them.
- Raw `Bun.serve` edges the middle group, but by about 1.5% over h3, which is at the limit of what five runs can resolve. Against `bun-web-standard` the 3.3% gap is real.

The takeaway I'd stand behind: `bun` in this table is `Bun.serve` with no framework at all — hand-written routing, hand-written query parsing. Two frameworks beat it, and two more land within 2% of it. **The routing abstraction is free**, and Elysia's is better than free.

I should disclose that I've contributed to Elysia's documentation, so take my enthusiasm about the top row with appropriate salt. It's also not a surprising result — Elysia generates its route handlers ahead of time, which is exactly what this kind of benchmark rewards. What it does *not* tell you is how a real application behaves once handlers touch a database, and at that point the spread across the top six is noise next to your query planner.

The bottom of the table deserves its own look. Express is 2.5× slower than Elysia and carries a 822.8 KB bundle with 220 MB of RSS after load, against Elysia's 56 MB. If you're moving an Express app onto Bun and expecting the runtime to fix your throughput: the runtime helps, but the framework is what's costing you.

## The desktop comparison

This is the part I actually ran the benchmark for. My five-run means against the upstream README's numbers from the i7-13700K desktop:

| Framework | M5 Air | i7-13700K | M5 as % of desktop |
| --- | ---: | ---: | ---: |
| elysia-aot | 131,288 | 209,333 | 63% |
| elysia | 136,966 | 209,850 | 65% |
| hono | 121,215 | 160,703 | 75% |
| bun | 123,131 | 163,149 | 75% |
| bun-web-standard | 119,195 | 148,887 | 80% |
| h3 | 121,272 | 150,884 | 80% |
| express | 55,156 | 56,130 | 98% |
| effect | 91,875 | 90,077 | 102% |

The laptop is not uniformly slower. It gives up more than a third of the desktop's throughput on the fastest framework, matches it on express, and is *marginally faster* on effect. That spread — 63% to 102% — is far too wide to be run-to-run noise, which is around 1%.

The ordering is the opposite of intuition, but it makes sense once you look at where the time goes. When the framework is thin, most of the work per request is the HTTP stack — syscalls, loopback, connection handling — and that's where the desktop's clock speed and memory subsystem win, while my load generator is simultaneously fighting the server under test for the same 10 cores. When the framework is heavy, time per request is dominated by JavaScript execution inside the handler, and M5 single-core is simply competitive with a 13700K there.

Put bluntly: **the faster your framework, the more your hardware matters.** Express is slow enough that it hides the difference between a laptop and a desktop entirely.

The video column is the exception to my own explanation, and I'd rather flag it than tidy it away. Six of the eight targets score 1,530–1,735 req/s upstream against my 777–846 — the laptop gives up about half, a much wider gap than any other route. The other two go the opposite way: upstream's h3 manages only 272 req/s on video where mine averages 794, and express is 263 against my 313. I can't explain either direction from these runs, so treat the whole video column as an open question rather than a finding.

## What I'd caution against

- **This is one machine.** Five runs pin down the run-to-run noise on *this* laptop; they say nothing about how another M5, or a machine with a fan, would behave.
- **The load generator shares the machine with the server.** bombardier and the framework are competing for the same 10 cores. This compresses everything, and it compresses the fast frameworks hardest — which is part of why my desktop-versus-laptop ratios are not clean hardware ratios.
- **It's a laptop running a desktop OS.** Spotlight, Time Machine, and whatever else macOS decided to do during those ten seconds are all in the numbers. That is most of what the ±1% is.
- **Fanless means thermals are a real variable.** I saw no thermal warnings across any of the five runs, which surprised me — but each run is only about five minutes of load, with a two-minute cooldown between. A sustained benchmark would likely tell a different story.
- **Benchmark handlers are empty.** Every route here returns immediately. The moment a handler awaits a database, these differences shrink toward irrelevance.

## Reproducing it

```sh
git clone https://github.com/saltyaom/bun-http-framework-benchmark
cd bun-http-framework-benchmark
bun install
bun run verify   # boots every framework and checks the routes

bun benchmark bun/elysia bun/elysia-aot bun/hono bun/bun \
  bun/bun-web-standard bun/h3 bun/effect bun/express
```

Results land in `results/results.md`, with the raw bombardier output per framework under `results/bun/`. Two things that cost me time:

The runner deletes the entire `results/` directory at the start of every run, so if you want to compare passes you have to copy each one somewhere else before starting the next.

And run it more than once. A single pass of this suite produces a clean, confident, precisely-ordered table, and somewhere in the middle of that table the ordering is fiction. I'd not have known that from one run — I'd have published it.

The upstream README says it best: run this on your own machine, because performance varies between machines. That turned out to be true in a more interesting way than I expected.
