---
name: seo-checklist
description: Audit a blog post or website for SEO and report what is present, partial, missing, unverified, or not applicable in an evidence-backed checklist table. Use for SEO checklists, pre-publication SEO reviews, and requests such as ตรวจ SEO or อันไหนมีแล้วอันไหนยังไม่มี. Audits are read-only unless fixes are also requested.
---

# SEO checklist

Produce a practical checklist in the user's language (Thai when the request is Thai). Assess the requested article or site with evidence and actionable priorities. Do not change content or configuration merely to complete an audit.

## Scope and evidence

- Use an explicitly named file or URL as the target. Otherwise use the active article from IDE context and its shared rendering components. For a whole-site request, inspect shared templates and identify the pages or samples actually checked; do not generalize a sample into an exhaustive audit.
- Read the repository's `AGENTS.md` and discover the current content schema, routes, layouts, metadata, sitemap, and robots handling. For the icerust Astro blog, also read [references/icerust-astro.md](references/icerust-astro.md). Treat this reference as a map to verify, not a stored audit result.
- Separate evidence from source code, generated HTML/XML, live HTTP responses, and external services. Trace fields through their callers: having a metadata component or a frontmatter field does not prove the target page uses it correctly.
- Prefer current rendered output when available. Establish whether an existing build matches the source before relying on it. If needed, inspect package scripts before running a local build; do not run publishing commands. Follow repository instructions if starting a server is necessary.
- For live checks, use the supplied URL or a verified production origin from configuration. Record the URL and check date. Compare source and deployment explicitly when they differ.
- If tooling, network access, deployment, or account data is unavailable, complete local checks and mark the dependent items unverified. Never interpret an access failure as evidence that a feature is missing.
- Verify changing SEO guidance against relevant official Google Search Central documentation. Cite the page near the recommendation; do not browse every reference for a narrow audit. For source-only requests, stay local and state the verification limit.

## Checklist coverage

Use one row per independently assessable item. Include the relevant categories below; keep unverified external checks visible rather than silently dropping them.

| Category | What to inspect |
| --- | --- |
| Search intent and content | Does the title's promise match the article? Clear answer, useful original experience, appropriate terminology, and credible sources for factual claims. Distinguish editorial judgment from measured search demand. |
| Title and description | Page-specific, nonempty, accurate rendered title and description; duplication within the actual inspected scope. Treat character counts as editorial hints, not rigid ranking rules. |
| Headings | A clear main heading and readable hierarchy in the rendered page; include headings injected by layouts, not just Markdown. |
| URL and canonical | Absolute preferred URL, correct production host/path, consistency with internal links and sitemap, and observed redirects when live access is available. |
| Crawl and index eligibility | HTTP status, robots.txt rules, meta robots, and X-Robots-Tag where observable; inspect unintended noindex and blocked resources. Absence of an explicit index tag is normal. robots.txt controls crawling and is not a reliable deindexing mechanism. |
| Sitemap | Valid generated XML, inclusion of intended canonical URLs, no unexpected drafts or broken targets, accurate modification dates. Sitemap existence and submission are separate checks. |
| Language versions | Document language, real translation pairs, self-references, and reciprocal hreflang URLs where applicable. HTML, HTTP headers, and sitemap are alternative hreflang mechanisms; do not require all three. Check consistency if more than one is present. |
| Article structured data | Parsed JSON-LD of an appropriate type, matching visible content, author identity, dates, canonical identity, and relevant images. Distinguish JSON validity, current Google property recommendations, and externally tested rich-result eligibility. |
| Images | Relevant images, descriptive alt text for meaningful images (empty alt can suit decorative images), dimensions, and loading behavior; verify image paths resolve at the evidence level available. |
| Internal discovery | Crawlable links from index/series/related pages, descriptive anchors, broken links, and orphan risk in the inspected scope. |
| Social previews | Open Graph and card metadata, absolute URLs, and whether the article image reaches metadata instead of an unintended fallback. Label these as sharing enhancements, not direct ranking requirements. |
| Mobile and performance | Viewport, observed mobile layout, image/font loading, and measured performance. Separate local/lab results from field Core Web Vitals; source code alone cannot establish a passing score. |
| Search Console and outcomes | Ownership verification, sitemap submission, URL index status, Google-selected canonical, impressions, and clicks when account evidence is available. A verification tag or analytics script does not prove these outcomes. |

Do not invent missing requirements such as meta keywords, keyword density, a minimum word count, mandatory FAQ schema, mandatory translations, or compulsory analytics. Treat optional enhancements as optional. Do not promise rankings, recrawling, or rich results from a checklist pass.

For claims about costs, course details, or personal outcomes, distinguish the author's dated experience from current general facts. Do not silently rewrite the author's story during a review.

## Status and priority

Use exactly these statuses in a Thai report; translate consistently for other languages:

- **มีแล้ว**: the stated criterion is satisfied at the identified evidence level. A source-level finding must say it is source-level, not live-verified.
- **มีบางส่วน**: implemented but incomplete, incorrectly wired, inconsistent, or only some inspected pages meet the criterion. Explain the specific gap.
- **ยังไม่มี**: absence is established within the inspected scope. A file search alone is insufficient if an equivalent implementation may exist elsewhere.
- **ยังตรวจไม่ได้**: evidence is insufficient or requires unavailable rendering, HTTP, measurements, or account access. State the next check.
- **ไม่เกี่ยวข้อง**: the criterion does not apply, with a brief reason (for example, hreflang for an article without translations).

Use P0 for confirmed unintended indexing/crawl blockers or severe canonical errors; P1 for consequential content or implementation defects; P2 for improvements; and — for passed, irrelevant, or unprioritized unverified items. Explain impact rather than claiming a universal ranking weight. Missing optional features are not automatically defects.

## Report format

Start with the target, audit date, and evidence levels used. Report counts by status, not an arbitrary SEO score. If sampling, name the sample and coverage limit.

| หมวด | รายการตรวจ | สถานะ | หลักฐาน / สิ่งที่พบ | สิ่งที่ควรทำต่อ | ความสำคัญ |
| --- | --- | --- | --- | --- | --- |

Populate the table with actual findings. Link each local finding to a file and relevant line, or to the inspected URL/artifact. Separate implementation from external outcomes into different rows when their statuses differ. For satisfied items, the action can be “—”. For unverified items, name the needed observation rather than recommending an unnecessary implementation.

End with at most three next actions ordered by impact. Only include confirmed findings in this list, or clearly identify a verification task. If fixes were explicitly requested, report the post-fix state and the checks performed; otherwise stop after the audit.

## Official references

- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): content, titles, descriptions, links, and images.
- [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article): current supported types and property guidance.
- [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions): hreflang mechanisms and reciprocal sets.
- [Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): URL inclusion, lastmod, and submission.
- [robots.txt introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro): crawling versus indexing.
- [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals): performance evidence and search context.
