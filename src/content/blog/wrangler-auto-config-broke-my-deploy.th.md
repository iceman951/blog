---
title: 'deploy พัง ทั้งที่ผมไม่ได้แก้อะไรเลย'
description: 'เดือนสิงหาคม deploy เขียว เดือนกันยายน pipeline เดิมเป๊ะ แต่ build พังสองครั้งติด ต้นเหตุคือเครื่องมือที่ CI โหลดใหม่ทุกครั้ง แล้วมันตอบคำถาม setup ของตัวเองว่า yes'
pubDate: 'Sep 13 2026'
updatedDate: 'Sep 13 2026'
tags: ['Cloudflare', 'CI', 'Astro']
lang: 'th'
translationKey: 'wrangler-auto-config-broke-my-deploy'
---

สวัสดีครับ คราวนี้ไม่ใช่เรื่อง benchmark แต่เป็นเรื่องที่เพิ่งเกิดกับบล็อกนี้เมื่อคืน 😅

ผม push บทความใหม่สองภาษาขึ้น `main` แล้ว deploy พัง build รอบสองก็พังซ้ำที่จุดเดิมเป๊ะ ทั้งที่ผมไม่ได้แตะ config การ build เลย pipeline เดียวกันนี้ deploy สำเร็จเมื่อสามสัปดาห์ก่อน และ clone commit ที่พังมา build บนเครื่องตัวเองก็ผ่านฉลุย

ต้นเหตุคือบรรทัดใน build log ที่อ่านดูเหมือนข้อความสุภาพ ๆ:

```
? Proceed with setup?
🤖 Using fallback value in non-interactive context: yes
```

มีอะไรบางอย่างใน pipeline ถามคำถามขึ้นมา ไม่มีใครอยู่ตอบ แล้วมันตัดสินใจเองว่าค่าปลอดภัยคือ **yes**

## สรุปก่อน เผื่อยังไม่อยากอ่านยาว

- `bun run build` **สำเร็จ** สร้างครบ 9 หน้า แล้วขั้น deploy ไป build ใหม่อีกรอบจนพัง
- deploy command คือ `npx wrangler deploy` ซึ่งใน CI container ที่เริ่มใหม่ทุกครั้ง `npx` จะดึงเวอร์ชันใหม่สุดมาเสมอ
- wrangler ไม่เจอ config ในรีโป เลยเข้าโหมด auto-config ตอบ prompt ตัวเองว่า yes สั่ง `astro add cloudflare` แก้ `.gitignore` แล้ว build ใหม่
- adapter ที่มันติดตั้งไม่รองรับ Astro 7.2.9 → `MISSING_EXPORT: renderForPrerender` ซึ่ง wrangler เตือนไว้เองสองบรรทัดก่อนหน้า
- แก้ด้วยการ commit `wrangler.jsonc` เข้ารีโป — **การมีไฟล์นี้คือตัวแก้** เพราะ auto-config จะไม่ทำงานเมื่อเจอ config
- บทเรียน: `npx <tool>` ใน deploy command คือ dependency ที่ไม่มีใครจดไว้ที่ไหนเลย

## เครื่องมือที่ใช้

บล็อกนี้เป็น Astro 7.2.9 output แบบ static deploy ขึ้น Cloudflare Workers ผ่าน Git integration และตอนที่พังนั้น **ในรีโปไม่มีไฟล์ CI หรือไฟล์ config ของ deploy เลยสักไฟล์** คำสั่ง build กับ deploy อยู่ใน dashboard ของ Cloudflare ซึ่งตอนนั้นเป็นแบบนี้:

| | |
| --- | --- |
| Build command | `bun run build` |
| Deploy command | `npx wrangler deploy` |
| Output directory | `dist` |

deploy command บรรทัดนั้นแหละครับคือตัวปัญหา เดี๋ยวย้อนมาหาอีกที

## build สำเร็จ ก่อนจะพัง

ส่วนที่งงที่สุดของ log คือ build มัน**ผ่าน** สร้างครบทั้ง 9 หน้า รวมบทความใหม่สองภาษาด้วย:

```
Executing user build command: bun run build
18:18:52 [build] output: "static"
18:18:53   ├─ /blog/elysia-hono-postgres-on-m5-air/index.html (+36ms)
18:18:53 [build] 9 page(s) built in 2.73s
18:18:53 [build] Complete!
Success: Build command completed
```

จากนั้นขั้น deploy เริ่มทำงาน แล้ว build เว็บ *ใหม่อีกรอบ*:

```
Executing user deploy command: npx wrangler deploy
npm warn exec The following package was not found and will be installed: wrangler@4.131.1
```

wrangler มองหา config ของตัวเองในรีโป ไม่เจอ เลยเสนอจะสร้างให้:

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

มันเตือนเองว่าเวอร์ชัน Astro ของผมไม่รองรับ แล้วก็ไปต่ออยู่ดี เพราะค่า fallback ของคำถาม "proceed?" ในบริบทที่ไม่มีคนตอบคือ yes มันติดตั้ง Cloudflare adapter แก้ `.gitignore` ของผม แล้ว build รอบสองด้วย adapter ที่ build รอบแรกไม่เคยมี:

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

adapter ที่มันติดตั้ง import ตัวแปรที่ Astro 7.2.9 ไม่ได้ export ออกมา — ตรงกับที่ warning สองบรรทัดก่อนหน้าทำนายไว้เป๊ะ

## แล้วทำไมเดือนสิงหาคมมันผ่าน

deploy command คือ `npx wrangler deploy` และใน container ของ CI ที่เริ่มใหม่หมดทุกครั้ง `npx` จะดึงเวอร์ชันใหม่สุดที่เข้าเกณฑ์ **ทุกครั้งที่รัน** deploy เขียวครั้งสุดท้ายของผมคือ 27 สิงหาคม ส่วนครั้งที่พังคือ 12 กันยายน ระหว่างนั้นผมไม่ได้เปลี่ยนอะไรเลย — แต่ build สองวันนั้น**ไม่ได้รัน wrangler ตัวเดียวกัน**

ตรงนี้แหละที่ผมคิดว่าควรจดไว้ ผมอ่าน pipeline ของตัวเองมาตลอดว่าเป็นของตายตัวที่ไม่เวิร์กก็พัง ทั้งที่จริงหนึ่งในขั้นตอนของมันคือ **"โหลดเครื่องมือตัวนี้เวอร์ชันล่าสุดมา แล้วเอาไปรันกับรีโปของฉัน"** นั่นคือ dependency ที่ไม่ได้ pin และมีสิทธิ์เขียนไฟล์ใน source tree ของผม โดยนั่งอยู่ในช่องกรอกข้อความบน dashboard ที่ไม่มีอะไรทำให้ดูเหมือน dependency เลยสักนิด

ยังมีอีกจุดที่ทำให้แย่กว่าเดิม: มันมองไม่เห็นจนกว่าจะพัง ในรีโปของผมไม่มีคำว่า `wrangler` อยู่ที่ไหนเลย ไม่มีใน lockfile ไม่มีเลขเวอร์ชันในไฟล์ config ไม่มีอะไรให้รีวิวตอนเปิด pull request ที่เดียวที่ dependency ตัวนี้ถูกบันทึกไว้คือช่อง text input ในหน้า settings

## วิธีแก้คือไม่ให้มันเดา

wrangler รัน auto-config เพราะมันหา config ไม่เจอ วิธีแก้จึงคือให้ config มันไปซะ เว็บนี้ prerender ทั้งหมดอยู่แล้ว สิ่งที่ต้องการจึงเป็น Worker แบบ assets-only ที่ไม่มี entrypoint ฝั่ง server:

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

ชื่อกับค่า compatibility ผมไม่ได้คิดเอาเอง แต่อ่านมาจาก version ที่เสิร์ฟ production อยู่จริง:

```sh
wrangler versions view <version-id> --name blog
# Compatibility Date:   2026-08-26
# Compatibility Flags:  global_fetch_strictly_public
```

version นั้นไม่มี binding อะไรเลย ซึ่งเป็นเหตุผลที่ assets-only เป็นเป้าที่ปลอดภัยแทนที่จะเป็นการเดา — ผมไม่ได้เอา static file server ไปแทน server จริง ผมแค่จดสิ่งที่มีอยู่แล้วลงไฟล์

ก่อน push ใช้ `--dry-run` ยืนยันว่า config ใช้ได้และ auto-config ไม่ทำงานแล้ว:

```sh
wrangler deploy --dry-run
# ✨ Read 42 files from the assets directory .../dist
# Total Upload: 0.40 KiB / gzip: 0.28 KiB
# No bindings found.
```

push ถัดไป build แล้ว deploy เสร็จในราวสี่นาที

## สิ่งที่ผมได้จากเรื่องนี้

**prompt ที่ตอบตัวเองได้ คือการเปลี่ยน config อย่างหนึ่ง** ประโยค `🤖 Using fallback value in non-interactive context: yes` คือเครื่องมือตัดสินใจแทนเรา ในสภาพแวดล้อมเดียวที่ไม่มีมนุษย์คนไหนคัดค้านได้ ค่า fallback ของขั้นตอน setup ที่ไปแก้ไฟล์คนอื่น จะเป็น `no` ก็สมเหตุสมผล แต่มันเป็น `yes` ทั้งที่เพิ่งพิมพ์ warning ออกมาเองว่าอาจไม่เวิร์ก

**`npx <tool>` ใน deploy command คือ dependency ที่คุณไม่ได้ติดตาม** ถ้าขั้นตอนหนึ่งใน pipeline โหลดเวอร์ชันล่าสุดของตัวเองมา แปลว่า deployment ของคุณผูกกับตารางปล่อยของของคนอื่น ให้ pin ซะ หรือให้ config มันไปเพื่อให้มันมีเรื่องต้องตัดสินใจน้อยลง

**เครื่องมือที่ build โปรเจกต์คุณใหม่ ทำมากกว่าแค่ deploy** ผมเคยเข้าใจว่า `wrangler deploy` คือการอัปโหลด `dist/` ขึ้นไป แต่มันรัน `astro add` ติดตั้ง dependency แก้ `.gitignore` แล้ว build ใหม่จาก source — build ที่พังไม่ใช่ build ที่ผมเขียนไว้

**เขียวเมื่อวาน ไม่ได้แปลว่าเขียววันนี้** สัญญาณที่มีประโยชน์ไม่ใช่ "commit นี้แก้ build config ไหม" (ไม่ได้แก้) แต่คือ "pipeline นี้รันจริงครั้งสุดท้ายเมื่อไหร่" การไม่ deploy สามสัปดาห์ก็คือ drift สามสัปดาห์ที่ผมมองไม่เห็น

## สิ่งที่ผมยังไม่กล้าสรุป

ผมไม่รู้ว่า wrangler เวอร์ชันไหนรันเมื่อ 27 สิงหาคม เพราะผมไม่ได้เก็บ log นั้นไว้ ผมจึงชี้ไปที่ release ใด release หนึ่งแล้วบอกว่ามันเป็นตัวเริ่มพฤติกรรมนี้ไม่ได้ — บอกได้แค่ว่าตอน pipeline ทำงานครั้งสุดท้ายมันยังไม่มี และหลังจากนั้นมันมีอยู่สองครั้งติด

อีกอย่างคือผมยังไม่ได้ทดสอบว่าถ้าใช้ Astro เวอร์ชันที่รองรับ จะรอดจาก auto-config ไหม มีโอกาสรอดสูงด้วยซ้ำ เพราะความไม่เข้ากันอยู่ระหว่าง adapter กับ Astro 7.2.9 โดยเฉพาะ ซึ่ง wrangler ก็พูดเองแล้ว วิธีแก้ของผมเป็นการเลี่ยงคำถามมากกว่าตอบคำถาม ซึ่งคุ้มสำหรับบล็อก แต่อาจไม่คุ้มสำหรับระบบที่คุณต้องถือเวรอยู่

และปัญหาที่ลึกกว่านั้นยังไม่ถูกแก้ด้วย config ของผม เพราะ deploy command ยังเป็น `npx wrangler` อยู่ดี มันจึงยังดึง wrangler ตัวใหม่สุดทุก build ผมแค่เอาการตัดสินใจที่มันทำได้แย่ออกไปเท่านั้น ถ้าอยากได้เวอร์ชันที่แข็งแรงกว่านี้ ให้ pin wrangler เป็น devDependency แล้วเรียก binary ในเครื่องแทน
