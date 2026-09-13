---
title: 'The Monday effect I found was not a long weekend'
description: 'A day-of-week regression on eight high-interest tech stocks produced a family-wise p of 0.001. I first blamed the calendar. The opening prices say otherwise, and the honest conclusion is narrower than either story.'
pubDate: 'Sep 13 2026'
updatedDate: 'Sep 13 2026'
tags: ['Finance', 'Statistics', 'Backtest']
heroImage: '../../assets/monday-effect-dca.svg'
lang: 'en'
translationKey: 'monday-effect-was-a-long-weekend'
---

If you buy the same amount of a stock every week, you have to pick a day. Someone always suggests Monday, on the strength of a finance-textbook anomaly called the weekend effect. So I ran the regression on ten years of daily data for eight stocks people actually watch, expecting to write a short post saying the effect is long dead.

That is not what came back. The first pass found a pattern that survived a family-wise test. The first version of this post then explained the pattern away as a calendar artefact — Monday returns span three days, everything else spans one — and gave it the title above, minus one word. A review of the statistics found that the explanation was not something I had tested, that the test I had leaned on was broken in three separate ways, and that the DCA comparison was not a fair one. This is the rewrite. The numbers are regenerated, the code has tests, and the conclusion is smaller than the one I started with.

**None of this is investment advice — I am not a licensed adviser, and the practical conclusion below is that the choice barely matters anyway.** It is also an exploratory analysis on eight names I picked because they are famous in 2026, and every number here is conditional on that.

## What I measured

Eight tickers — NVDA, TSLA, AAPL, MSFT, AMZN, META, GOOGL, AMD — over **2,512 trading days**, 14 September 2016 to 11 September 2026. Split-adjusted opens and closes from Nasdaq's public historical endpoint; the market series is the S&P 500 index level from FRED. "Tech" is the informal label: the eight sit in three GICS sectors (Information Technology, Consumer Discretionary, Communication Services), and what they have in common is that they are large US technology-and-growth companies that did very well.

The regression is the standard one. For each stock, using daily log returns, with Monday as the baseline day:

```
r_t = α + β·r_market,t + γ_Tue·D_Tue + γ_Wed·D_Wed + γ_Thu·D_Thu + γ_Fri·D_Fri + ε_t
```

Each γ answers "does this stock earn more or less on this weekday than on Monday, after taking out whatever the market did that day". Standard errors are Newey-West with 8 lags, because daily returns are heteroskedastic and mildly autocorrelated and classical standard errors would claim more precision than the data has.

## The first result looked strong

Unconditionally, Monday is the *best* day for three of the eight — NVDA, TSLA and AMD — which is already the opposite of the textbook weekend effect:

| | Mon | Tue | Wed | Thu | Fri |
| --- | ---: | ---: | ---: | ---: | ---: |
| NVDA | 30.8 | 21.8 | 30.0 | 19.6 | −2.4 |
| TSLA | 66.9 | 18.7 | 20.9 | −33.3 | −3.3 |
| AMD | 56.3 | 15.4 | 21.5 | −3.6 | 2.7 |
| AAPL | 19.0 | 16.8 | 21.1 | −7.4 | 0.7 |

<p class="affiliate-note">Mean log return in basis points per trading day. For the other four names Monday ranks second or third.</p>

Market-adjusted, TSLA rejects the null that every day equals Monday at χ²(4) = 17.6, p = 0.001; AAPL at p = 0.021. Nine of the thirty-two day coefficients come in under p = 0.05.

The first version of this post said Bonferroni could not be used here because the eight stocks are correlated. That was wrong. Bonferroni and Holm control the family-wise error rate under *any* dependence; correlation makes them conservative, not invalid. So, applied properly: the Bonferroni threshold is 0.05/32 = 0.0016, and exactly one coefficient clears it — **TSLA Thursday−Monday, −87 bps, p < 0.001**. Holm, which is uniformly more powerful, rejects the same one and nothing else. TSLA Friday−Monday, at p = 0.0017, misses by a hair.

What correlation *does* cost is power, and that is a fair reason to also want a test that uses the dependence instead of ignoring it. The first version had one: shuffle the weekday labels and refit. Three things were wrong with it. Shuffling labels across the whole series destroys volatility clustering and the autocorrelation the Newey-West errors exist for. It compared classical t-statistics to a null of classical t-statistics while the tables reported HAC ones. And the random number generator was a hand-rolled congruential generator whose state, after JavaScript's floating-point arithmetic and a 31-bit mask, cycles every 10,466 draws — a shuffle of 2,512 days consumes 2,512 draws, so the "2,000 permutations" were about four distinct shuffles repeated five hundred times. Its p-value of 0.0005 was not a measurement of anything.

The replacement is a dependent wild bootstrap. Fit each stock *without* the day dummies, keep the fitted values and residuals in their calendar slots, and build a null sample as fitted + residual × w, where w is one standard normal per block of ten trading days and **the same w series is applied to all eight stocks**. That keeps heteroskedasticity, volatility clustering and same-day cross-sectional correlation, and keeps serial dependence within blocks. Refit with the dummies, record the largest HAC |t| among the 32 coefficients, repeat 4,999 times:

| | max &#124;t&#124; |
| --- | ---: |
| observed | 3.96 |
| null median | 2.19 |
| null 95th percentile | 3.05 |
| null 99th percentile | 3.51 |

Six draws out of 4,999 exceed the observed value. Family-wise p = **0.0014**, Monte Carlo standard error 0.0005; block lengths of 1, 5 and 20 days give 0.0045, 0.002 and 0.002. The bootstrap's own assumptions are that the restricted model's residuals are the right noise and that Gaussian multipliers are a fair stand-in for resampling them; it does not know about anything the model leaves out. On those terms, the Monday pattern in this sample is not noise, and it is essentially one stock's.

## Then I asked how long a Monday is

A stock's Monday return is Monday's close divided by Friday's close. It spans the weekend. Every other day's return spans one night.

```
Mon 3.04 calendar days     Tue 1.30     Wed 1.01     Thu 1.01     Fri 1.03
```

Tuesday is 1.30 rather than 1.00 because Monday holidays push the gap onto Tuesday. This is the standard definition of the weekend effect, not an error in itself; the literature has always measured Monday close-to-close. But it raises a legitimate question: if a stock drifts upward with calendar time, a three-day interval earns more than a one-day interval, and a "Monday premium" could be nothing but that.

My first attempt to answer it was to add a regressor for elapsed calendar days since the previous close:

| Wald p | base | calendar-controlled | winsorized 1% | trimmed 1% | first half | second half |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| NVDA | 0.215 | 0.250 | 0.075 | 0.072 | 0.821 | **0.023** |
| TSLA | **0.001** | 0.122 | **<0.001** | **<0.001** | **0.003** | 0.071 |
| AAPL | **0.021** | **0.004** | **0.034** | **0.039** | **0.001** | 0.387 |
| MSFT | 0.484 | 0.616 | 0.528 | 0.421 | 0.386 | 0.803 |
| AMZN | 0.316 | 0.162 | 0.091 | **0.026** | **<0.001** | 0.790 |
| META | 0.510 | 0.387 | 0.272 | 0.312 | 0.425 | 0.965 |
| GOOGL | 0.906 | 0.391 | 0.734 | 0.267 | 0.311 | 0.997 |
| AMD | 0.065 | 0.788 | **0.050** | **0.045** | 0.160 | 0.660 |

TSLA goes from 0.001 to 0.122 and AMD from 0.065 to 0.788, and the first version of this post called that the effect "being the calendar". Look at what actually moved. TSLA's Thursday−Monday coefficient went from −87 bps to −78 bps — about a tenth — while its standard error went from 22 bps to 49 bps. The t-statistic fell because the uncertainty doubled, not because the estimate shrank. The reason is mechanical: with Monday as the baseline, "calendar days minus one" is almost the Monday dummy in disguise. Regressed on the weekday dummies it has an R² of 0.76, and the only observations that tell the two apart are the 96 holiday-shifted days in the sample. Twelve of the 32 day coefficients change sign under the control, not "most" as I first wrote, and the family-wise bootstrap on the controlled specification gives p = 0.107 — which says the controlled model can no longer see the pattern, not that the pattern is calendar time. A regression with two nearly collinear regressors cannot attribute the effect to either. I had.

## What the opening prices say

The data include opens, so the question can be asked directly instead of through a collinear regressor. Split each day's return into two legs: previous close → open (for Monday, that is the whole weekend) and open → close (the trading session). If the Monday premium is calendar drift, it lives in the first leg, and the weekend should earn about three normal nights.

| | overnight Mon | overnight Tue–Fri mean | session Mon | session Tue–Fri mean |
| --- | ---: | ---: | ---: | ---: |
| NVDA | −4.6 | 21.3 | 35.4 | −4.0 |
| TSLA | 22.7 | 8.0 | 44.2 | −7.2 |
| AAPL | −6.4 | 1.7 | 25.5 | 6.1 |
| AMD | 24.7 | 15.3 | 31.6 | −6.3 |

<p class="affiliate-note">Mean log return in basis points; no market adjustment, since the index series has no opens. All eight names are in results.json.</p>

It does not live there. For six of the eight, the Friday-close-to-Monday-open leg is the *lowest* overnight return of the week — that is the textbook weekend effect, faintly, with the correct sign. For all eight, the Monday open-to-close session is the *highest* of the five sessions. Whatever produces a high Monday close-to-close return in this sample is happening between 9:30 and 16:00 on Monday, not across the weekend. A calendar-time-drift story predicts the opposite. So the explanation I titled the first version of this post with was not just untested; it was wrong.

I want to be equally careful in the other direction. The session-level differences are significant at the 5% level for only three names before any multiplicity correction (NVDA 0.020, TSLA 0.020, AAPL 0.032), the overnight ones for none, and this is a descriptive split of one sample. What it supports is narrow: the effect, where there is one, is a Monday-session effect, and it is not a unit error.

## Two more checks, and what they can and cannot say

**Outliers.** Winsorising at the 1st and 99th percentiles, or dropping the 1% most extreme days outright, leaves TSLA at p < 0.001. That says the TSLA result is not sensitive to capping or removing the tail at this level; it does not by itself say the result is "spread across the sample", which is what I claimed before. For that I did the direct thing: refit TSLA's Thursday−Monday coefficient 2,512 times, leaving out one day each time. The single most influential day moves t by 0.28. Removing the five most influential days together takes the coefficient from −87 bps (t = −3.96) to −96 bps (t = −4.66); removing the twenty-five most influential leaves −74 bps (t = −3.92). The days that matter most were pulling *against* it. Now I can say it: the result is not carried by a handful of days.

**Stability.** The first version split the decade in half, saw that different names were significant in each half, and called that "does not replicate out of sample". Neither clause holds. The halves are two pieces of the same sample I selected after the fact, so nothing here is out of sample. And "significant in one half, not the other" is not evidence of a difference — the difference has to be tested. So: one pooled regression per stock with a second-half indicator interacted with every regressor, and a Wald test on the four interactions.

| | first half p | second half p | difference p | largest change, bps (95% CI) |
| --- | ---: | ---: | ---: | ---: |
| TSLA | 0.003 | 0.071 | 0.073 | Fri−Mon +95 (13 to 177) |
| AAPL | 0.001 | 0.387 | **0.012** | Fri−Mon +51 (22 to 80) |
| AMZN | <0.001 | 0.790 | **0.011** | Fri−Mon +59 (18 to 101) |
| NVDA | 0.821 | 0.023 | 0.295 | Thu−Mon +52 (−9 to 113) |

For AAPL and AMZN the first-half pattern is genuinely different in the second half: a Friday-versus-Monday gap of forty to fifty basis points closed, with confidence intervals well clear of zero. For TSLA and NVDA the halves are compatible with the same coefficients. So the honest summary is that two of the three names with a first-half signal changed, one did not, and the one that did not is the one carrying the whole-sample result. Whether TSLA's Monday premium continues is not something ten years of TSLA can tell you.

## What it is worth to a DCA schedule

The statistical question and the practical question are different, so I simulated the practical one, this time on equal terms. The first version compared plans with different numbers of purchases and different amounts invested; here every plan buys $100 once per calendar week, and if the chosen weekday is a holiday the order fills on the next trading day, the same rule for every day. Over the 521 full weeks in the sample every plan invests exactly $52,100, and all five are valued at the same final close.

| | best day | final value, best − worst | as % of final value | in return points |
| --- | ---: | ---: | ---: | ---: |
| NVDA | Mon | $11,168 | 0.88 | 21.4 |
| AMD | Mon | $3,757 | 0.49 | 7.2 |
| TSLA | Mon | $2,321 | 0.58 | 4.5 |
| AAPL | Mon | $1,065 | 0.51 | 2.0 |
| GOOGL | Mon | $750 | 0.37 | 1.4 |
| MSFT | Mon | $688 | 0.45 | 1.3 |
| META | Mon | $561 | 0.39 | 1.1 |
| AMZN | Mon | $501 | 0.39 | 1.0 |

<p class="affiliate-note">$100 weekly, 521 installments, September 2016 to September 2026. "Return points" is (final value / $52,100 − 1) × 100, best day minus worst.</p>

Monday wins on all eight, by between 0.4% and 0.9% of the final value. That is not the regression showing up: it is drift. These stocks rose a great deal, so within any week the earliest purchase was on average the cheapest, and four days of NVDA's average daily return is roughly 0.8%. Buying on Monday bought you an average of four days' head start, and nothing more.

For scale, I ran a second experiment on the other thing a weekly plan cannot choose: which week it happens to begin. Fix the number of installments at 469 (nine years), fix the weekday, and start the plan anywhere from zero to 51 weeks into the sample. On Wednesday plans, the best and worst start dates differ by 695 points of total return on NVDA, 463 on TSLA, 770 on AMD, and 62 to 150 on the other five — an order of magnitude or two more than the weekday choice in the same grid. Two things about that number: the plans end up to 51 weeks apart, so it measures the luck of when your nine years fall, not a "few weeks" of difference; and it is a property of this sample and this simulator, not a constant of nature. The chart at the top is that comparison.

So the answer to the question I set out with: in this sample there is a real-looking Monday-session premium, mostly in TSLA; its size is under one percent of a decade's DCA outcome; and where you start dwarfs it. Choosing the weekday is not a decision worth having.

## What this does not support

- **The sample is survivors.** I picked eight companies that are famous in 2026. Every one of them is an enormous winner, chosen after the fact. That biases the return levels grotesquely, it is why "Monday wins" in the DCA table, and I cannot rule out that it shapes the weekday structure too.
- **This is exploratory.** One sample, sliced many ways, with the specification chosen while looking at the results. The bootstrap p-value does not know that.
- **Prices are split-adjusted but not dividend-adjusted.** For AAPL and MSFT that leaves out roughly half a percent a year, and if ex-dividend dates cluster on particular weekdays it lands on one coefficient rather than spreading out.
- **The market series excludes dividends**, being an index level rather than a total-return index, and has no opens, so the open-to-close split is unadjusted for the market.
- **One market, one decade, one kind of company.** Eight large US technology-and-growth names in a decade that treated them very well.
- **The bootstrap keeps dependence within ten-day blocks and breaks it at the edges**, and it assumes the residuals of the restricted model are the noise. Different blocks give the same answer, which is reassuring rather than conclusive.

## Reproducing it

The price and index data cannot be redistributed, so this repository carries the derived statistics and the code that rebuilds the inputs, not the series:

```sh
cd analysis/monday-effect
bun run fetch.ts    # downloads into ./data, which is gitignored
bun run run.ts      # writes public/analysis/monday-effect/results.json (about ten minutes)
bun run hero.ts     # rebuilds the chart above from that file
bun test            # OLS, HAC, tail probabilities, RNG, Holm, DCA rules
```

Every number in this post comes out of [results.json](/analysis/monday-effect/results.json), including the ones that contradict the first version. The regression, Newey-West covariance, Wald test, exact normal and chi-square tails, the PRNG and the bootstrap loop are a few hundred lines of TypeScript with no dependencies, and now have tests that check them against closed forms — which is worth knowing: the machinery here is small enough to read, and reading it is cheaper than trusting it.

Three bugs worth confessing, since all three were live while I was drawing conclusions. My upper-tail chi-square helper first returned the wrong tail for negative arguments, so a Wald statistic of 1.02 on 4 degrees of freedom reported p = 0.094 instead of 0.906; I found it because a p-value disagreed with the statistic beside it. Fixed, it was still a Wilson–Hilferty approximation quoted to four decimals; it is now exact. And the random number generator behind the first family-wise test had a period of 10,466, which no test of mine would have caught, because I had no tests. The kind of internal contradiction worth looking for on purpose is not only between a p-value and its statistic; it is between the story in the title and whether anything in the code actually tested it.
