---
title: "What is an M.Sc. in Financial Engineering? What you study, and what background helps"
description: "What Financial Engineering is, what you study, what it costs, and how to prepare — notes from the first 3–4 weeks of an M.Sc. at UTCC."
pubDate: 'Sep 19 2026'
updatedDate: 'Sep 22 2026'
heroImage: '../../assets/what-is-financial-engineering.th.webp'
lang: 'en'
tags: ['Financial Engineering', 'Quant', "Master's Degree", 'UTCC', 'Learning Journal']
translationKey: 'what-is-financial-engineering'
series: 'master-financial-engineering-utcc'
seriesOrder: 1
---

**TL;DR**

- **What you study** — finance + mathematics + statistics + programming, used to value securities, measure return and risk, and build models to help make decisions.
- **What helps before you start** — calculus (both differentiation and integration), probability, and some practice writing basic proofs. Finance and programming make classes easier to follow, but you don't need a degree in either.
- **How classes run** — a full day on Saturday and half a day on Sunday. You can attend online or on-site and switch every week.
- **Who it suits** — people who want to understand finance through numbers and models. You don't need a finance or computer science background, but if you want to avoid equations altogether, this might not be for you.

---

I'm about 3–4 weeks into an M.Sc. in Financial Engineering. I didn't enrol because I'd decided to leave software development. I wanted to understand finance better, be more systematic about my own portfolio and trading, and give myself more options later on.

Before starting, I thought of it as using maths and programming to solve finance problems. Taking the first three courses together — derivatives, statistics, and investment theory — has made that a bit clearer. There's more to it than writing programs about stocks; you need several subjects to work through the same problem.

This isn't a review from someone who's finished the programme. It's what the start has been like for me: what we're studying and what I think helps you keep up.

## What is Financial Engineering?

As I understand it so far, Financial Engineering uses **finance, mathematics, statistics, and programming** to solve financial problems. That includes valuing securities, measuring return and risk, and building models to help make decisions.

The “engineering” part is about working out a solution within a set of constraints. You need to know what the numbers represent, what assumptions you're making, and what the results can and can't tell you.

![Euler diagram: Financial Engineering is where Mathematics, Finance, and Programming overlap](../../assets/financial-engineering-venn.th.svg)

The diagram puts Financial Engineering where **mathematics** (including statistics), **finance**, and **programming** overlap. Problems like option pricing or risk management need a mix of these subjects.

I'm studying for the **M.Sc. in Financial Engineering** at the University of the Thai Chamber of Commerce (UTCC). It's a two-year master's degree with 42 credits. [Programme details](https://gs.utcc.ac.th/master-degree/financial-engineering/)

I chose UTCC because it's the closest university to where I live, so the commute is short, and I can study online when I can't make it to campus. I didn't compare the course content with other universities in detail. If things like the programme's reputation or alumni network matter more to you, it's worth comparing related programmes at other institutions, such as Chulalongkorn University (Chula) and the National Institute of Development Administration (NIDA), before deciding.

## What does it cost?

I joined in 2026 (2569 in the Thai calendar). So far, I've paid for two things:

- **Preparatory courses (3 courses)** — about THB 18,000
- **First semester (3 courses)** — about THB 38,000

The programme includes a summer term, and tuition for the whole programme is about **THB 220,000**. If you're thinking of applying, check the fees with the university again, as they may change for later intakes.

## What are the preparatory courses?

Before the first semester, there are three preparatory courses lasting eight weeks each. This counts as semester 0. The courses don't carry credits, and you get S/U (pass/fail) rather than a letter grade.

- **SM001 Calculus**
- **SM002 Business Statistics**
- **SM004 Introduction to Financial Programming**

If you've studied these subjects before, it's a chance to revise. If they're all new to you, I don't think eight weeks is that much time to learn everything from scratch.

## What do the first courses cover?

I'm taking three courses in the first semester, each with three hours of class a week. Classes are on Saturday from 9:00–12:00 and 13:00–16:00, and Sunday from 13:00–16:00.

The timetable can change between semesters. For example, the Saturday slots might stay the same while the Sunday class moves to Monday from 18:00–21:00. If you're arranging this around work, ask the faculty about the timetable first.

**SM511 — Fixed Income Securities and Derivative Securities**

We started with futures and have now moved on to options. We work through where prices come from and calculate the payoff at expiry for different possible stock prices.

So far, we've covered the binomial model: assume the stock price can move either up or down at each step, then work backwards to calculate the option price. We've also covered delta, which uses derivatives. The main textbook is Hull's *Options, Futures, and Other Derivatives*.

**SM512 — Statistical Theory**

This is the course where I've had to go back and revise the most maths. We started with the axioms of probability and proving Boole's inequality, then moved on to conditional probability, Bayes' theorem, random variables, and probability distributions.

After that came bivariate distributions, which describe two random variables together, such as the returns of two stocks. We've also covered statistical independence and finding the distribution of a function of a random variable — for example, showing that the square of a standard normal variable has a chi-square distribution.

There's a problem set almost every week, with 3–5 questions. That might not sound like many, but the first set already had “prove that” questions. You have to write out the reasoning, and the next topic builds on the previous one pretty quickly. The main textbook is DeGroot & Schervish's *Probability and Statistics* (4th ed., Pearson).

**SM513 — Investment Theory**

We've covered market efficiency — the idea that prices reflect available information, making excess returns hard to earn — followed by behavioral finance and security analysis, or analysing the value of securities. We're now on bond valuation. The main textbook is Bodie, Kane & Marcus's *Investments*.

Taking these courses together, I'm starting to see how much they borrow from each other. In SM513, for example, we use statistics to analyse returns. It doesn't stay in the SM512 classroom.

As for language, my SM512 homework questions are in Thai, with English terms in parentheses, such as “probability density function (p.d.f.)”. All three textbooks are in English, so you need to get used to the terminology, but the teaching and written work aren't all in English.

## Is Financial Engineering hard? How much maths do you need?

Maths is what I've had to spend the most time revising, especially **algebra and calculus**. They come up in almost every chapter, from rearranging equations and taking derivatives to integrating to find probabilities. Even if you've studied them before, I'd brush up, because you'll need them straight away.

Take the **delta of an option**, written as ∂C/∂S: the derivative of the option price with respect to the underlying stock price. Roughly speaking, it asks, “If the stock moves by one baht, how much will the option price move?” If you've taken derivatives before, it's easier to follow the calculation. If you haven't, you're learning about options and derivatives at the same time.

In SM512, this comes up within the first few weeks too. A question might give you f(x) = ce^(−3x) and ask what c needs to be for it to be a probability density function. You integrate from 0 to infinity and set the result equal to 1. With two random variables, you need double integrals, sometimes over a region with a curved boundary, such as 0 ≤ y ≤ 1 − x². If you're rusty on integration, that's where you'll get stuck first.

Something else I hadn't prepared for was **writing proofs**. The first SM512 problem set was entirely “show that” and “prove that” questions. We had to prove probability inequalities using induction and de Morgan's laws. I had to go back over sets — union, intersection, complement — and practise writing out the reasoning step by step. Being able to do the calculations isn't enough for these questions.

I'm spending about 6 hours a week reading and doing homework outside class, mostly on SM512 problem sets, even though I've studied calculus before. If you're starting from scratch, my guess is you might need 2–3 times as much time. I'd try to read some of it beforehand, because classes move quite quickly. I'm not saying calculus is an admission requirement; I just think preparing would make the work easier to manage.

### Which maths should you revise?

If I were starting again, I'd focus on the topics needed in the first few weeks. You don't have to reread all of Calculus 1–2–3 from cover to cover. This is roughly what I'd go through:

1. **Limits, derivatives, and differentiation rules** from Calculus 1. You use these for the delta of an option and to find a p.d.f. from a C.D.F.
2. **Integration** from Calculus 2. Practise integrating e^(−ax), xⁿ, and integrals from 0 to infinity. You need these to find normalising constants for p.d.f.s and to calculate C.D.F.s from the third SM512 problem set onwards.
3. **Sets and basic proof writing**: union, intersection, complement, de Morgan's laws, and induction. These come up in the very first SM512 problem set.
4. **Basic probability and linear algebra**. Include conditional probability and Bayes' theorem, since you use them in SM512. Linear algebra helps when you get to matrices and multiple variables.
5. **Partial derivatives, optimisation, and double integrals** from Calculus 3. Practise integrals over non-rectangular regions for bivariate distributions. Partial derivatives come up in the Greeks, which describe how sensitive an option's price is to different factors. Delta is one of them.
6. **Taylor series** from Calculus 2. I haven't used this directly in the early weeks, so if you're short on time, it can wait.

For **probability and statistics**, I'd also revise mean, variance, probability distributions, conditional probability, and regression. In SM513, for example, we use regression analysis on returns. We read the coefficients to see the direction and size of a relationship, then look at the p-value as well. You don't have to start by memorising every formula, but you should understand what the numbers are telling you.

### Do you need to know how to code? What language do you use?

We're using **Excel and Python** at the moment. So far, the programming hasn't been complicated. Being comfortable with Excel and having tried some Python helps a lot, especially when you're doing calculations with data.

For example, one SM512 assignment gives us a CSV of mutual funds with their names, asset classes, and whether they invest domestically or overseas. We have to count proportions and make a cross-tab to answer probability questions. Other questions ask us to plot p.d.f.s and C.D.F.s. Excel or Python is fine, as long as you can open the file, filter the data, and count it.

Knowing a bit about financial instruments, returns, and risk makes the questions easier to understand, but you don't need a finance degree.

If I didn't have much time to prepare, I'd read up on calculus and statistics first. They're the two subjects I keep going back to when doing homework.

If you'd rather avoid equations altogether, I'd also look at general finance programmes or an MBA. Almost every course here involves equations and proofs.

## Can you study online or on-site?

Both are available. My cohort currently has classes all day Saturday and half of Sunday. You can attend online or on-site and **switch every week** without choosing one format when you enrol. If you can't get to campus one week, you can join live online, and there are recordings to watch afterwards.

If you can, I'd go on-site for the first one or two weeks of each course. That gives you a chance to hear how each lecturer teaches, how the exams work, and what you'll need to do. For later intakes, check with the faculty whether the arrangements are still the same.

I usually go on-site because I find it easier to concentrate and follow what the lecturer writes on the board. If I can't keep up with a calculation, I can go back to the recording later. It depends on your schedule and how you prefer to learn.

## Who are my classmates?

There are more backgrounds than I expected: business administration, economics, marketing, and engineering. Ages range from the twenties to the forties. Some have just finished their bachelor's degree; others have been working for years. If you're coming from another field, you won't be the only person in the room without a finance or computer science degree.

## What jobs does it lead to? (As far as I know so far)

The jobs that tend to come up are quantitative analyst (quant), risk management, portfolio management, and roles in FinTech. But I've been studying for less than a month, so I can't say much from my own experience yet. I'll come back to this once I've talked to students further along in the programme and studied more myself.

I'm not planning a career change right now. I want to use what I learn to manage my own portfolio and trading first, with a better understanding of what I'm investing in and how much risk I'm taking. What I'll do after graduating is something I'll figure out later.

## How have the first 3–4 weeks been?

There's been more maths and statistics from the start than I expected. We use them across courses all the time, whether it's calculus for calculations involving securities or statistics to interpret an analysis of returns.

I come from software development, and knowing how to code helps with some of the work. But I've still had to spend a lot of time revising calculus and statistics. I think people coming from finance would need to prepare for those too. Is the programme worth it? How hard are the full two years? I can't answer that yet — I've only just started.

I'll write again once I've studied a bit more. I'll keep notes in this series on what we've covered, what I've understood, and what I'm still stuck on.
