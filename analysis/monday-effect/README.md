# Day-of-week effects and what they are worth to a weekly DCA

Supports the post *The Monday effect I found was a long weekend*.

```sh
bun run fetch.ts    # price + index series into ./data (gitignored)
bun run run.ts      # regressions, permutation test, DCA simulation -> results.json
bun run hero.ts     # rebuilds the article's chart from results.json
```

`run.ts` writes `../../public/analysis/monday-effect/results.json`, which is what the
article quotes. Regenerating it is how you check the article rather than trust it.

## Data

| Series | Source | Redistributable |
| --- | --- | --- |
| Daily closes, 8 US tech tickers | Nasdaq public historical endpoint | No — vendor terms |
| S&P 500 index level | FRED series `SP500` | Yes — US government work |

Closes are split-adjusted and **not** dividend-adjusted. `./data` is gitignored for the
first reason; the derived statistics in `results.json` are safe to publish and are.

## Method

Daily log returns, Monday as the baseline day:

```
r_t = α + β·r_market,t + Σ_{d∈{Tue..Fri}} γ_d·D_d,t + ε_t
```

- Newey-West (Bartlett, Greene's bandwidth) standard errors; classical ones are reported
  alongside because the permutation null uses them.
- Wald test that all four day coefficients are jointly zero.
- Permutation test: one shuffled calendar applied to all eight tickers per draw, so the
  cross-sectional correlation survives — which is why Bonferroni is the wrong instrument
  here. Statistic is max |t| over the 32 day coefficients.
- Robustness: a control for elapsed calendar days since the previous close, 1% winsorising,
  and both halves of the sample.
- DCA: $100 weekly on a fixed weekday, compared against holding the weekday fixed and
  varying the starting week.

`lib.ts` implements OLS, the HAC covariance, the Wald statistic and the chi-square upper
tail in about 150 lines with no dependencies.

## Not investment advice

This is a methodology exercise. The finding is that the weekday choice is dominated by the
start date, and that the largest apparent effect is mostly an artefact of Monday returns
spanning three calendar days.
