---
title: 'My deploy broke and my repository did not change'
description: 'A green deploy in August, an identical pipeline in September, and a build that failed twice. The cause was a tool my CI downloads fresh on every run, answering its own setup prompt with yes.'
pubDate: 'Sep 13 2026'
updatedDate: 'Sep 13 2026'
tags: ['Cloudflare', 'CI', 'Astro']
lang: 'en'
translationKey: 'wrangler-auto-config-broke-my-deploy'
---

I pushed two articles to this blog and the deploy failed. The build ran a second time and failed again, in exactly the same place. Nothing about the build configuration had changed, the same pipeline had deployed successfully three weeks earlier, and a clean clone of the failing commit built on my laptop without a complaint.

The cause turned out to be a line in the build log that reads like a courtesy message:

```
? Proceed with setup?
🤖 Using fallback value in non-interactive context: yes
```

Something in my deploy pipeline asked a question, nobody was there to answer it, and it decided that the safe default was **yes**.

## The setup

This site is Astro 7.2.9, static output, deployed to Cloudflare Workers through the Git integration. At the time of the failure there was no CI or deploy configuration file in the repository at all: the build command and deploy command lived in the Cloudflare dashboard, and they were:

| | |
| --- | --- |
| Build command | `bun run build` |
| Deploy command | `npx wrangler deploy` |
| Output directory | `dist` |

That deploy command is where this story happens, and I will come back to it.

## The build succeeded before it failed

The most confusing part of the log is that the build works. All nine pages are generated, including the two new articles:

```
Executing user build command: bun run build
18:18:52 [build] output: "static"
18:18:53   ├─ /blog/elysia-hono-postgres-on-m5-air/index.html (+36ms)
18:18:53 [build] 9 page(s) built in 2.73s
18:18:53 [build] Complete!
Success: Build command completed
```

Then the deploy step starts, and builds the site *again*:

```
Executing user deploy command: npx wrangler deploy
npm warn exec The following package was not found and will be installed: wrangler@4.131.1
```

Wrangler looks at the repository, finds no configuration of its own, and offers to create one:

```
Detected Project Settings:
 - Worker Name: blog
 - Framework: Astro
 - Build Command: bun run build
 - Output Directory: dist

? Do you want to modify these settings?
🤖 Using fallback value in non-interactive context: no

▲ [WARNING] The version of Astro used in the project ("7.2.9") is not officially
  supported, and may fail to correctly configure. [...]

? Proceed with setup?
🤖 Using fallback value in non-interactive context: yes

🛠️  Configuring project for Astro with "astro add cloudflare"
├ Adding Wrangler files to the .gitignore file
[build] Running: bun run build
```

It warned me that my Astro version was not supported, and then proceeded anyway, because the fallback for "proceed?" in a non-interactive context is yes. It installed the Cloudflare adapter, edited my `.gitignore`, and ran a second build with an adapter the first build never had:

```
[build] 18:19:17 [build] adapter: @astrojs/cloudflare
[build] 18:19:18 [ERROR] [vite] ✗ Build failed in 730ms
[build] [MISSING_EXPORT] "renderForPrerender" is not exported by
        "node_modules/astro/dist/core/app/entrypoints/index.js".
           ╭─[ node_modules/@astrojs/cloudflare/dist/utils/prerender.js:1:10 ]
         1 │ import { renderForPrerender } from "astro/app";
           │          ─────────┬────────
           │                   ╰────────── Missing export
✘ [ERROR] Running custom build `bun run build` failed. [...]
Failed: error occurred while running deploy command
```

The adapter it installed imports a symbol that Astro 7.2.9 does not export. That is exactly the failure the warning two lines earlier predicted.

## Why it worked in August

The deploy command is `npx wrangler deploy`, and in a CI container that starts clean every time, `npx` fetches the newest matching version on every run. My last green deploy was on 27 August; this failure was on 12 September. In between, I changed nothing — but the build did not run the same wrangler on those two days.

This is the part I find worth writing down. I had been reading my deploy pipeline as a fixed thing that either works or doesn't, when in fact one of its steps is **"download whatever the latest release of this tool is, and run it against my repository."** That is an unpinned dependency with write access to my source tree, and it is sitting in a field in a dashboard where it does not look like a dependency at all.

A second detail makes it worse: the failure is invisible until it happens. Nothing in my repository says `wrangler`. There is no lockfile entry, no version number in a config file, nothing to review in a pull request. The only place that dependency is written down is a text input on a settings page.

## The fix is to stop the tool from guessing

Wrangler ran its auto-configuration because it found no configuration. So the fix is to give it one. The site is fully prerendered, so what it needs is an assets-only Worker with no server entrypoint:

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "blog",
	"compatibility_date": "2026-08-26",
	"compatibility_flags": ["global_fetch_strictly_public"],
	"assets": {
		"directory": "./dist",
		"html_handling": "auto-trailing-slash"
	}
}
```

The name and compatibility settings are not invented — I read them off the version that was actually serving production:

```sh
wrangler versions view <version-id> --name blog
# Compatibility Date:   2026-08-26
# Compatibility Flags:  global_fetch_strictly_public
```

That version had no bindings at all, which is what made an assets-only Worker a safe target rather than a guess: I was not replacing a server with a static file server, I was writing down what was already there.

Before pushing, `--dry-run` confirms the config is valid and that auto-config no longer triggers:

```sh
wrangler deploy --dry-run
# ✨ Read 42 files from the assets directory .../dist
# Total Upload: 0.40 KiB / gzip: 0.28 KiB
# No bindings found.
```

The next push built and deployed in about four minutes.

## What I would take from this

**A prompt that answers itself is a configuration change.** `🤖 Using fallback value in non-interactive context: yes` is a tool making a decision on your behalf in the one environment where no human can object. The fallback for a destructive-ish setup step could reasonably have been `no`; it was `yes`, and the tool had already printed a warning saying this might not work.

**`npx <tool>` in a deploy command is a dependency you are not tracking.** If a step in your pipeline downloads its own latest version, your deployment is coupled to someone else's release schedule. Pin it, or give it a config file so it has less to decide.

**A tool that rebuilds your project is doing more than deploying it.** I had assumed `wrangler deploy` uploaded `dist/`. It ran `astro add`, installed a dependency, edited `.gitignore` and rebuilt from source. The build that failed was not the build I wrote.

**Green yesterday is not green today.** The useful signal was not "did this commit change the build config" — it hadn't — but "when did this pipeline last actually run." Three weeks of not deploying was three weeks of drift I could not see.

## What I am not claiming

I do not know which wrangler version ran on 27 August, because I did not keep that log. So I cannot point at a specific release and say it introduced this behaviour — only that the behaviour was not there when the pipeline last worked, and was there twice in a row afterwards.

I also have not tested whether a supported Astro version would have survived the auto-configuration. It might well have: the incompatibility is between the adapter and Astro 7.2.9 specifically, and wrangler said so itself. My fix sidesteps the question rather than answering it, which is the right trade for a blog, and might not be for something you are on call for.

And the deeper problem is not fixed by my config file. The deploy command still runs `npx wrangler`, so it will still fetch the newest wrangler on every build. All I have done is remove the decision it was making badly. If you want the stronger version of this fix, pin wrangler as a devDependency and call the local binary.
