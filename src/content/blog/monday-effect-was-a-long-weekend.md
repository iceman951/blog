---
title: 'The Monday effect I found was a long weekend'
description: 'A day-of-week regression on eight high-interest tech stocks produced a family-wise p of 0.0005. Then I checked how many calendar days a Monday return actually covers, and most of the effect went away.'
pubDate: 'Sep 13 2026'
tags: ['Finance', 'Statistics', 'Backtest']
heroImage: '../../assets/monday-effect-dca.svg'
lang: 'en'
translationKey: 'monday-effect-was-a-long-weekend'
---

If you buy the same amount of a stock every week, you have to pick a day. Someone always suggests Monday, on the strength of a finance-textbook anomaly called the weekend effect. So I ran the regression on ten years of daily data for eight stocks people actually watch, expecting to write a short post saying the effect is long dead.

That is not what came back. The first pass found a pattern that survived a permutation test at a family-wise p of 0.0005. The second pass found out what the pattern was, and it was not a market anomaly. It was the calendar.

**None of this is investment advice — I am not a licensed adviser, and the conclusion below is that the choice barely matters anyway.**

## What I measured

Eight tickers — NVDA, TSLA, AAPL, MSFT, AMZN, META, GOOGL, AMD — over **2,512 trading days**, 14 September 2016 to 11 September 2026. Split-adjusted closes from Nasdaq's public historical endpoint; the market series is the S&P 500 index level from FRED.

The regression is the standard one. For each stock, using daily log returns, with Monday as the baseline day:

```
r_t = α + β·r_market,t + γ_Tue·D_Tue + γ_Wed·D_Wed + γ_Thu·D_Thu + γ_Fri·D_Fri + ε_t
```

Each γ answers "does this stock earn more or less on this weekday than on Monday, after taking out whatever the market did that day". Standard errors are Newey-West, because daily returns are heteroskedastic and mildly autocorrelated and classical standard errors would claim more precision than the data has.

## The first result looked strong

Unconditionally, Monday is the *best* day for most of these names, which is already the opposite of the textbook weekend effect:

| | Mon | Tue | Wed | Thu | Fri |
| --- | ---: | ---: | ---: | ---: | ---: |
| NVDA | 30.8 | 21.8 | 30.0 | 19.6 | −2.4 |
| TSLA | 66.9 | 18.7 | 20.9 | −33.3 | −3.3 |
| AMD | 56.3 | 15.4 | 21.5 | −3.6 | 2.7 |
| AAPL | 19.0 | 16.8 | 21.1 | −7.4 | 0.7 |

<p class="affiliate-note">Mean log return in basis points per trading day.</p>

Market-adjusted, TSLA rejects the null that every day equals Monday at χ²(4) = 17.6, p = 0.002; AAPL at p = 0.021. Nine of the thirty-two day coefficients come in under p = 0.05.

The naive reading is that nine hits against "about 1.6 expected by chance" is a real signal. That reading is wrong, and not for the usual reason. Bonferroni assumes the tests are independent, and these eight stocks move together — after removing market beta their residuals still share a technology factor. The multiplicity arithmetic does not apply.

So I built the null empirically instead. Shuffle the weekday labels across the calendar, apply **the same shuffled calendar to all eight stocks** so the cross-sectional correlation survives, refit everything, record the largest |t| anywhere in the 32 coefficients, and repeat 2,000 times:

| | max &#124;t&#124; |
| --- | ---: |
| observed | 4.21 |
| null median | 2.20 |
| null 95th percentile | 3.09 |
| null 99th percentile | 3.48 |

Family-wise p = **0.0005**. Something in the day-of-week structure is not random.

## Then I asked how long a Monday is

A stock's Monday return is Monday's close divided by Friday's close. It spans the weekend. Every other day's return spans one night.

```
Mon 3.04 calendar days     Tue 1.30     Wed 1.01     Thu 1.01     Fri 1.03
```

Tuesday is 1.30 rather than 1.00 because Monday holidays push the gap onto Tuesday. So "average return per trading day, by weekday" is comparing a three-day interval against one-day intervals. If a stock drifts upward with calendar time at all, Monday is mechanically higher, and none of that is a market anomaly — it is a unit error.

Adding one regressor for elapsed calendar days since the previous close is enough to test it:

| Wald p | base | calendar-controlled | winsorized 1% | first half | second half |
| --- | ---: | ---: | ---: | ---: | ---: |
| NVDA | 0.213 | 0.248 | 0.074 | 0.823 | **0.022** |
| TSLA | **0.002** | 0.120 | **0.001** | **0.004** | 0.070 |
| AAPL | **0.021** | **0.004** | **0.034** | **0.001** | 0.387 |
| MSFT | 0.486 | 0.619 | 0.530 | 0.386 | 0.806 |
| AMZN | 0.316 | 0.160 | 0.090 | **0.000** | 0.792 |
| META | 0.512 | 0.388 | 0.271 | 0.426 | 0.962 |
| GOOGL | 0.906 | 0.391 | 0.737 | 0.310 | 0.995 |
| AMD | 0.064 | 0.790 | **0.049** | 0.159 | 0.664 |

TSLA goes from 0.002 to 0.120. AMD goes from 0.064 to 0.790. Most of the day coefficients flip sign, and the largest |t| across the whole panel falls from 3.96 to 2.72. The strongest single result in the study was substantially a statement about weekends being longer than weeknights.

Two more checks, because "it was the weekend" is itself a claim that can be lazy:

**It is not driven by a handful of huge days.** Winsorising returns at the 1st and 99th percentiles barely moves anything — TSLA stays at p = 0.001. Whatever this is, it is spread across the sample rather than carried by four earnings gaps.

**It does not repeat.** Split the decade in half and the significant names change. AAPL is p = 0.001 in the first half and 0.387 in the second. AMZN goes 0.000 to 0.792. NVDA is the reverse, 0.823 then 0.022. Three of eight in the first half, one of eight in the second, and not the same one. A stable calendar effect would not behave like that.

AAPL is the one result that strengthens under the calendar control and holds in the first half. I am not going to build a story around a single surviving name out of eight after the sample has been sliced this many ways; that is how you talk yourself into a finding.

## What it is worth to a DCA schedule

The statistical question and the practical question are different, so I simulated the practical one directly: $100 every week for ten years, always on the same weekday, then compare the five schedules on final value.

| | weekday choice | starting week | ratio |
| --- | ---: | ---: | ---: |
| NVDA | 25.1 | 649.0 | 26× |
| AMD | 22.9 | 379.5 | 17× |
| TSLA | 14.3 | 148.6 | 10× |
| AAPL | 4.4 | 66.5 | 15× |
| AMZN | 3.0 | 37.9 | 13× |
| META | 2.5 | 21.0 | 8× |
| MSFT | 2.2 | 51.7 | 23× |
| GOOGL | 2.2 | 42.5 | 20× |

<p class="affiliate-note">Spread between best and worst outcome, in percentage points of total return. "Weekday choice" varies the day and holds the start; "starting week" holds the day (Wednesday) and varies which of the first 52 weeks you began in.</p>

The best weekday beats the worst by 2.2 points on MSFT, on a total return of about 192 points. Starting the identical plan a few weeks earlier or later moves the same outcome by 52 points. **Across all eight names, when you started matters 8 to 26 times more than which weekday you picked** — and which stock you picked dwarfs both, since NVDA returned roughly 2,370% against MSFT's 192%.

So the answer to the question I set out with is: no weekday is reliably better, the largest apparent effect was mostly a unit error, it does not replicate out of sample, and even at face value it is an order of magnitude smaller than the noise from an arbitrary start date.

## What this does not support

- **The sample is survivors.** I picked eight companies that are famous in 2026. Every one of them is an enormous winner, chosen after the fact. That biases the return levels grotesquely, and I cannot rule out that it shapes the weekday structure too.
- **Prices are split-adjusted but not dividend-adjusted.** For AAPL and MSFT that leaves out roughly half a percent a year, and if ex-dividend dates cluster on particular weekdays it lands on one coefficient rather than spreading out.
- **The market series excludes dividends**, being an index level rather than a total-return index.
- **One market, one decade, one sector.** These are eight US technology names in a decade that treated US technology names very well.
- **The permutation null shuffles labels, not blocks.** It preserves the marginal distribution of returns and the cross-sectional correlation, but it does not preserve volatility clustering within a week.

## Reproducing it

The price data cannot be redistributed, so this repository carries the derived statistics and the code that rebuilds the inputs, not the prices:

```sh
cd analysis/monday-effect
bun run fetch.ts    # downloads into ./data, which is gitignored
bun run run.ts      # writes public/analysis/monday-effect/results.json
bun run hero.ts     # rebuilds the chart above from that file
```

Every number in this post comes out of [results.json](/analysis/monday-effect/results.json), including the ones that disagree with my first conclusion. The regression, Newey-West covariance, Wald test and permutation loop are about 150 lines of TypeScript with no dependencies, which is worth knowing: the machinery here is small enough to read, and reading it is cheaper than trusting it.

One bug worth confessing, since it was live while I was drawing conclusions: my upper-tail chi-square helper returned the wrong tail for negative arguments, so a Wald statistic of 1.02 on 4 degrees of freedom reported p = 0.094 instead of 0.906. It made a nothing result look interesting. I found it because a p-value disagreed with the statistic beside it, which is the kind of internal contradiction worth looking for on purpose.
