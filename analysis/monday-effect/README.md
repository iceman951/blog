# Day-of-week effects and what they are worth to a weekly DCA

Supports the post *The Monday effect I found was a long weekend*.

```sh
bun run fetch.ts    # price + index series into ./data (gitignored)
bun run run.ts      # regressions, bootstrap, DCA simulation -> results.json (~10 min)
bun run hero.ts     # rebuilds the article's chart from results.json
bun test            # OLS, HAC, tail probabilities, RNG, multiple comparisons, DCA rules
```

`run.ts` writes `../../public/analysis/monday-effect/results.json`, which is what the
article quotes. Regenerating it is how you check the article rather than trust it.
`BOOT=200 bun run run.ts` is a quick pass with fewer bootstrap draws.

This is an exploratory analysis on eight tickers chosen in 2026 because they are famous
in 2026. Every number is conditional on that selection.

## Data

| Series | Source | Redistributable |
| --- | --- | --- |
| Daily opens and closes, 8 US tickers | Nasdaq public historical endpoint | No — vendor terms |
| S&P 500 index level | FRED series `SP500` | No — © S&P Dow Jones Indices LLC; FRED's terms cover access, not redistribution |

Closes are split-adjusted and **not** dividend-adjusted. `./data` is gitignored because
neither series may be republished; the derived statistics in `results.json` are ours and are.

The eight names span three GICS sectors — Information Technology (NVDA, AAPL, MSFT, AMD),
Consumer Discretionary (TSLA, AMZN) and Communication Services (META, GOOGL) — so "tech" in
the article is the informal sense: large US technology-and-growth companies.

## Method

Daily log returns, Monday as the baseline day:

```
r_t = α + β·r_market,t + Σ_{d∈{Tue..Fri}} γ_d·D_d,t + ε_t
```

- Newey-West (Bartlett, Greene's bandwidth: 8 lags) standard errors throughout.
- Wald test that all four day coefficients are jointly zero; exact chi-square tail.
- Multiple comparisons: Bonferroni and Holm over the 32 day coefficients. Both hold under
  arbitrary dependence; correlated tests make them conservative, not wrong.
- Family-wise inference by **dependent wild bootstrap**: under the null the day dummies do
  nothing, so `y* = fitted(restricted) + resid(restricted) · w`, where `w` is one standard
  normal per block of 10 trading days and the same `w` series is applied to all eight
  tickers. Residuals stay in their calendar slots, so heteroskedasticity, volatility
  clustering and same-day cross-sectional correlation are kept; serial dependence is kept
  within blocks. Statistic: max |t| over the 32 HAC t-statistics. 4,999 draws; the p-value
  is reported with its Monte Carlo standard error; block lengths 1, 5 and 20 as sensitivity.
  Assumptions: the restricted model's residuals are the noise, and Gaussian multipliers are
  an adequate stand-in for resampling them. This replaces an earlier label-permutation test
  that broke volatility clustering, used classical rather than HAC t-statistics, and drew its
  shuffles from a hand-rolled PRNG whose state cycled every 10,466 draws.
- Calendar control: elapsed calendar days since the previous close, minus one. The
  regressor is nearly collinear with the Monday dummy (R² on the weekday dummies is
  reported), so it is identified only by holiday-shifted observations. Treat the
  "calendar-controlled" specification as a consistency check, not a decomposition.
- Open-to-close split: with opens in the data, each weekday's return is separated into
  previous-close-to-open and open-to-close. Descriptive; no market control (FRED has no opens).
- Halves: a pooled regression with a second-half indicator interacted with every regressor;
  the Wald test on the four interactions is the test that the day coefficients differ.
  This is a stability check on one sample, not an out-of-sample test.
- Influence: leave-one-out over every trading day for the largest single coefficient, then
  refit without the 5, 10 and 25 most influential days. Also 1% winsorising and 1% trimming.
- DCA: $100 once per calendar week on a fixed weekday; a holiday order fills on the next
  trading day. Every plan has the same number of installments and the same total invested.
  Weekday experiment: all weeks, common final close. Start experiment: fixed number of
  installments, start delayed by 0–51 weeks, each plan valued at its own last close — the
  end dates differ by up to 51 weeks, and that is the "start timing" being measured.

`lib.ts` implements OLS, the HAC covariance, the Wald statistic, exact normal and chi-square
tails, a xoshiro128** PRNG, Holm's step-down and the bootstrap p-value with no dependencies.
`dca.ts` holds the DCA rules. Both have tests.

## Not investment advice

This is a methodology exercise. In this after-the-fact sample there is no evidence strong
enough to choose a DCA weekday on, and the data cannot reliably separate calendar-time drift
from a weekday effect.
