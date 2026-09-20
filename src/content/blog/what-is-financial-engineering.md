---
title: "What is a Master's in Financial Engineering? What you study, and what background helps"
description: "What Financial Engineering is, what the first courses cover, what it costs, and which maths to brush up on — notes from the first 3–4 weeks of an M.Sc. at UTCC."
pubDate: 'Sep 19 2026'
heroImage: '../../assets/what-is-financial-engineering.webp'
lang: 'en'
tags: ['Financial Engineering', 'Quant', "Master's Degree", 'UTCC', 'Learning Journal']
translationKey: 'what-is-financial-engineering'
series: 'master-financial-engineering-utcc'
seriesOrder: 1
---

**TL;DR**

- **What you study** — finance + mathematics + statistics + technology, used to value securities, measure return and risk, and build models that support decisions.
- **What you need first** — Calculus (both differentiation and integration) and Probability help a lot, and you should be comfortable writing basic proofs. Finance and programming make the lectures easier to follow, but you do not need a degree in either.
- **How classes run** — full-day Saturday, half-day Sunday, Online or On-site, and you can switch every week.
- **Who it suits** — people who want to understand finance through numbers and models. You do not need a finance or computer science background, but if you want to avoid equations altogether, this probably is not the programme for you.

---

I started a Master's in Financial Engineering about 3–4 weeks ago. The main reason was not a decision to leave software development. I wanted to understand finance more deeply, manage my own portfolio and trading more systematically, and give myself more options later on.

Before I started, my rough picture was “maths and programming applied to finance”. Taking the first three courses at once — derivatives, statistics, and investment theory — sharpened that picture: it is not just writing programs about stocks, but a place where several disciplines have to work together on the same problem.

So this is not a review of the programme after graduating. It is a snapshot from the start: what is actually taught, and which background I think helps you keep up.

## What is Financial Engineering?

As I understand it right now, Financial Engineering is the use of **Finance, Mathematics, Statistics, and Technology** to solve financial problems — from valuing securities and measuring return and risk, to building models that help make decisions.

“Engineering” here is close to designing a solution under constraints. You need to know what each computed number represents, which assumptions went into it, and what the result can and cannot tell you.

![Euler diagram: Financial Engineering is where Mathematics, Finance, and Technology overlap](../../assets/financial-engineering-venn.svg)

The diagram makes it easier to see that Financial Engineering sits where **Mathematics** (including statistics), **Finance**, and **Technology** overlap. Problems like Option Pricing or Risk Management do not draw on one field alone; they pull from several at once.

The programme I am on is the **M.Sc. in Financial Engineering** at the University of the Thai Chamber of Commerce (UTCC). It is a two-year master's degree of 42 credits. [Programme details](https://gs.utcc.ac.th/master-degree/financial-engineering/)

My reason for choosing it was straightforward: it is the closest to where I live, the commute is short, and I can attend online in weeks when going in is inconvenient. I did not compare the syllabus in detail against other universities. If your priorities are different — say, programme reputation or alumni network — compare several schools before deciding.

## What does it cost?

These are the amounts I actually paid in the 2026 intake (academic year 2569 in the Thai calendar). They give a sense of scale; they are not a guaranteed rate for future cohorts. Check with the university before applying.

- **Preparatory courses (3 courses)** — about THB 18,000
- **First semester (3 courses)** — about THB 38,000

I have not included a whole-programme figure yet, because I am not sure whether there is a summer term or how many courses later semesters carry. I will update this once I have seen the full study plan.

## What are the preparatory courses?

Before the first semester there are three preparatory courses, eight weeks each. They count as semester 0, carry no credits, and are graded S/U (pass/fail) rather than with a letter grade.

- **SM001 Calculus**
- **SM002 Business Statistics**
- **SM004 Introduction to Financial Programming**

The names alone tell you what background the programme expects, and they line up with what I describe in the next sections. But eight weeks go by fast. If you have studied this before, the block is a refresher; if you are starting from zero, it is learning everything from scratch on a tight clock.

## What do the first courses cover?

In the first semester I take three courses, three hours each per week. The current timetable is a full day on Saturday and a half day on Sunday (it may move to weekdays, Monday–Friday — ask the faculty directly). Each course shows a different side of Financial Engineering.

**SM511 — Fixed Income Securities and Derivative Securities** started with Futures and is now on Options. It does not stop at what each instrument is; it goes into where the price comes from and the Payoff (the contract's profit or loss at expiry for each possible stock price), the Binomial Model (a model that assumes the stock can only move up or down in each step, then works backwards to price the option), and Delta. This is where it becomes obvious that finance and mathematics have to go together. Main textbook: Hull, *Options, Futures, and Other Derivatives*.

**SM512 — Statistical Theory** starts from the axioms of probability and proofs of basic inequalities such as Boole's inequality, then moves through Conditional Probability and Bayes' Theorem, Random Variables and Probability Distributions, Bivariate Distributions (the joint distribution of two random variables — the returns of two stocks, say), Statistical Independence, and distributions of functions of random variables (for example, showing that the square of a standard normal variable is Chi-square distributed). There is a problem set almost every week, 3–5 questions each, and the very first set was all “prove that” questions rather than plug-in-the-numbers. This is the course where I have had to go back and revise the most maths, because each new topic builds on the last one quickly. Main textbook: DeGroot & Schervish, *Probability and Statistics* (4th ed., Pearson).

**SM513 — Investment Theory** connects theory to markets more directly. So far it has covered Market Efficiency (the hypothesis that prices already reflect available information, so excess returns are hard to come by), Behavioral Finance, and Security Analysis (analysis to estimate the value of a security), and is now on Bond Valuation. This course shows that statistics does not end in SM512 — it comes straight back in to analyse returns. Main textbook: Bodie, Kane & Marcus, *Investments*.

So the three courses are not cleanly separated into “one finance course, one statistics course”. What you learn in one becomes a tool in another.

On language: the problem sets I have received (at least in SM512) are written in Thai with the English technical term in parentheses — “probability density function (p.d.f.)”, for instance — while all three main textbooks are in English. You need to read technical English comfortably, but you do not need to listen to or write everything in English.

## Is Financial Engineering hard? How much maths do you need?

The short answer: you do not need to be strong at everything before you start, but there is no avoiding mathematics. From what I have seen so far, the background that matters most is **Algebra and Calculus** — especially Calculus, which shows up in almost every chapter: rearranging equations, differentiating, integrating a density function to get a probability, and explaining how one variable changes with another.

A clear example is the **Delta of an option**, written ∂C/∂S — the derivative of the option price with respect to the underlying stock price. In plain terms: “if the stock moves by one baht, roughly how much does the option move?” If you have seen derivatives before, you connect the symbol to the idea of price sensitivity quickly. If you have not, you are learning the notation and the concept at the same time.

An example from the statistics side: from the first few weeks, SM512 problems often hand you a function with an unknown constant c — something like f(x) = ce^(−3x) — and ask what c must be for it to be a valid density. That is just integrating from 0 to infinity and setting the result to 1. With two random variables, the same question becomes a double integral over a region bounded by a curve, such as 0 ≤ y ≤ 1 − x². If integration is not fluent, you get stuck setting up the problem before you have even started thinking about probability.

The thing I had not prepared for, and should have, is **writing proofs**. The first SM512 problem set was entirely “show that” and “prove that” — proving probability inequalities by induction, or via de Morgan's laws — which meant digging back into sets (union, intersection, complement) and how to write a proof step by step. That is a different skill from computation.

If you have never taken Calculus, I think you should read a fair amount before starting, because lectures move quickly. Right now I spend about 6 hours a week reading and doing problems outside class, most of it on the SM512 problem sets, and I had studied Calculus before. Someone starting from zero should budget more — perhaps 2–3 times that. This is my number alone, not a measurement, and Calculus is not an admission requirement; it is simply the time I would set aside to keep up.

### Which maths should you revise?

If I were preparing again with limited time, I would go in the order the topics actually show up in class — not in the order of university Calculus 1–2–3.

1. **Limits, derivatives, and differentiation rules** (Calculus 1) — used immediately for the Delta of an option, and for getting a p.d.f. from a C.D.F.
2. **Integration** (Calculus 2) — particularly integrals of e^(−ax) and xⁿ, and integrating from 0 to infinity. Needed for normalising constants and C.D.F.s from the third SM512 problem set onwards.
3. **Sets and basic proof writing** — union, intersection, complement, de Morgan's laws, and induction. Needed from the very first SM512 problem set.
4. **Basic Probability** (including Conditional Probability and Bayes' Theorem) alongside **basic Linear Algebra** — probability is used directly in SM512; linear algebra helps once matrices and multiple variables appear.
5. **Partial derivatives, optimisation, and double integrals over non-rectangular regions** (Calculus 3) — tied to the Greeks (the sensitivities of an option's price to various factors, of which Delta is one) and to bivariate distributions.
6. **Taylor series** (Calculus 2) — has not come up directly in the early weeks; it can wait.

The other part is **Probability and Statistics**. At minimum, be comfortable with mean, variance, probability distributions, conditional probability, and regression, because statistics is not confined to SM512. In SM513 we run regression analysis on returns, read the coefficients for direction and size of the relationship, and read the p-value as part of the assessment — without needing to memorise every formula first.

### Do you need to program? In which language?

The tools used in class right now are **Excel and Python**. If you have programmed or handled data before, it helps with calculations and experimenting with data, but from what I have seen so far you do not need to be able to code before you start. Being fluent in Excel and having touched Python should make the early weeks easier.

A real example: even SM512, a theory course, has homework questions that hand you a CSV of mutual funds (fund name, asset class, domestic or global policy) and ask you to count proportions and build a cross-tab to answer probability questions, plus questions that ask you to plot a p.d.f. and a C.D.F. Work like this is doable in either Excel or Python. It is not complex code, but you do need to be able to load, filter, and count data.

A finance background helps you pick up the context of instruments, returns, and risk faster, but you do not need a finance degree.

To sum up: you do not need to be strong in every area before applying, but with limited time I would prioritise revising Calculus and Statistics, because those two do the most to cut down on the number of times you have to stop and back-fill fundamentals mid-course.

Conversely, if you want to understand finance but would rather not touch equations at all, this programme is probably not the right fit — almost every course runs on equations and proofs. A general finance programme or an MBA may match what you are after more closely.

## Can you study Online or On-site?

For my cohort, classes are a full day on Saturday and a half day on Sunday. You can attend Online or On-site and **switch every week** as it suits you; there is no need to pick one format at enrolment. Online classes are live and recorded, which helps a lot in weeks when you cannot travel or are juggling study with work.

If you can manage it, I recommend attending On-site for the first one or two weeks of each course, so you hear the full rundown of how the course works, how it is assessed, and what the lecturer expects — each one organises things differently. The Online/On-site arrangement described here is my cohort's; it may change next year.

Personally I attend On-site most of the time, because I concentrate better and can follow the working on the board more continuously. That is a matter of what suits each person, not a claim that On-site is always better. The recordings are very useful when you want to go back over a calculation you did not catch the first time.

## Who are my classmates?

The class is more varied than I expected: ages from the twenties to the forties, fresh graduates alongside people with years of work behind them, and backgrounds in business administration, economics, marketing, and engineering — not only finance or computer science. If you are worried about coming from a different field, at least in this cohort there are plenty of people starting from different places.

## What jobs does it lead to? (as far as I know now)

Honestly, I cannot answer that from my own experience yet — I have been studying for less than a month. The paths that usually come up are Quantitative Analyst (Quant), Risk Management, Portfolio Management, and FinTech roles, but I will save the details for a later post, once I have talked to alumni and seen more of the second-year material.

For me, the first goal is not a career change. I want to apply what I learn about instruments, risk, and models to manage my own portfolio and trading with more discipline. Where that leads I will answer once I am further in.

## How I see the field after 3–4 weeks

What differs from what I expected is that the maths and statistics are demanding from the very start, and the courses are more interconnected than I thought. Calculus met in one course comes back to price an instrument in another; theoretical statistics gets used to read return analysis in a third.

It is too early for me to say how heavy the whole programme is or whether it is worth it. What I can say is that the preparation is not just programming for someone coming from development, and not just finance for someone coming from finance — Calculus and Statistics are the common language that ties everything together.

The next posts in this series will record what I actually learn, including what I do not yet understand, without rushing to conclusions this early on.
