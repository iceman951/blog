---
title: 'deploy พัง ทั้งที่ผมไม่ได้แก้อะไรเลย'
description: 'เดือนสิงหาคม deploy ผ่าน แต่เดือนกันยายน pipeline เดิมกลับ build พังสองครั้ง ต้นเหตุคือเครื่องมือที่ CI ดาวน์โหลดใหม่ทุกรอบ และตอบคำถาม setup ของตัวเองว่า yes'
pubDate: 'Sep 13 2026'
updatedDate: 'Sep 13 2026'
tags: ['Cloudflare', 'CI', 'Astro']
lang: 'th'
translationKey: 'wrangler-auto-config-broke-my-deploy'
---

ผม push บทความใหม่สองชิ้นขึ้นบล็อกนี้ แล้ว deploy ก็พัง พอลองใหม่รอบที่สองก็พังที่จุดเดิมอีก ทั้งที่ไม่ได้เปลี่ยนการตั้งค่า build เลย pipeline เดียวกันนี้ยัง deploy สำเร็จเมื่อสามสัปดาห์ก่อน และเมื่อลอง clone รีโปใหม่ที่ commit เดิมแล้ว build บนเครื่องตัวเอง ทุกอย่างก็ผ่านโดยไม่มีปัญหา

สุดท้ายต้นเหตุอยู่ในบรรทัดหนึ่งของ build log ที่ดูเผิน ๆ เหมือนเป็นเพียงข้อความอำนวยความสะดวก:

```
? Proceed with setup?
🤖 Using fallback value in non-interactive context: yes
```

ขั้นตอนหนึ่งใน pipeline ถามคำถามขึ้นมา ไม่มีใครอยู่ตอบ และมันก็ตัดสินใจเองว่าคำตอบที่ปลอดภัยคือ **yes**

## ระบบตอนเกิดปัญหา

บล็อกนี้ใช้ Astro 7.2.9 สร้างผลลัพธ์แบบ static และ deploy ขึ้น Cloudflare Workers ผ่าน Git integration ตอนที่เกิดปัญหา รีโปไม่มีทั้งไฟล์ CI และไฟล์ config สำหรับ deploy คำสั่ง build กับ deploy ตั้งอยู่ใน dashboard ของ Cloudflare ดังนี้:

| | |
| --- | --- |
| Build command | `bun run build` |
| Deploy command | `npx wrangler deploy` |
| Output directory | `dist` |

เรื่องทั้งหมดเกิดขึ้นที่ deploy command บรรทัดนี้ และผมจะกลับมาพูดถึงมันอีกที

## build ผ่าน ก่อนจะมาพังตอน deploy

ส่วนที่ชวนสับสนที่สุดใน log คือขั้น build ทำงานสำเร็จ หน้าเว็บทั้งเก้าหน้าถูกสร้างครบ รวมถึงบทความใหม่สองบทความด้วย:

```
Executing user build command: bun run build
18:18:52 [build] output: "static"
18:18:53   ├─ /blog/elysia-hono-postgres-on-m5-air/index.html (+36ms)
18:18:53 [build] 9 page(s) built in 2.73s
18:18:53 [build] Complete!
Success: Build command completed
```

จากนั้นขั้น deploy เริ่มทำงาน และ build เว็บ *ใหม่อีกรอบ*:

```
Executing user deploy command: npx wrangler deploy
npm warn exec The following package was not found and will be installed: wrangler@4.131.1
```

Wrangler ตรวจดูรีโป ไม่พบไฟล์ config ของตัวเอง จึงเสนอว่าจะสร้างให้:

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

มันเตือนว่า Astro เวอร์ชันที่ผมใช้ไม่ได้รับการรองรับอย่างเป็นทางการ แต่ก็ดำเนินการต่อ เพราะค่า fallback ของคำถามว่า "จะทำ setup ต่อไหม" ในสภาพแวดล้อมที่ไม่มีใครตอบคือ yes จากนั้นมันติดตั้ง Cloudflare adapter แก้ไฟล์ `.gitignore` และ build รอบสองด้วย adapter ที่ไม่มีอยู่ในการ build รอบแรก:

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

adapter ที่เพิ่งติดตั้งพยายาม import symbol ที่ Astro 7.2.9 ไม่ได้ export ออกมา ซึ่งก็คือข้อผิดพลาดแบบเดียวกับที่คำเตือนก่อนหน้านั้นเพิ่งบอกว่าอาจเกิดขึ้น

## แล้วทำไมเดือนสิงหาคมถึง deploy ผ่าน

deploy command คือ `npx wrangler deploy` และเมื่อรันใน CI container ที่เริ่มจากสภาพว่างทุกครั้ง `npx` จะดาวน์โหลดเวอร์ชันล่าสุดที่เข้าเงื่อนไขทุกครั้งที่รัน deploy ครั้งสุดท้ายที่ผ่านคือวันที่ 27 สิงหาคม ส่วนครั้งนี้พังเมื่อวันที่ 12 กันยายน ระหว่างนั้นผมไม่ได้เปลี่ยนอะไรเลย แต่สองรอบนี้ไม่ได้ใช้ Wrangler เวอร์ชันเดียวกัน

นี่คือประเด็นที่ผมคิดว่าควรจดไว้ ผมเคยมองว่า deploy pipeline เป็นของตายตัว มีเพียงทำงานได้หรือไม่ได้ ทั้งที่จริงแล้วหนึ่งในขั้นตอนของมันคือ **“ดาวน์โหลดเครื่องมือนี้เวอร์ชันล่าสุด ณ ตอนนั้น แล้วนำมารันกับรีโปของผม”** นั่นคือ dependency ที่ไม่ได้ตรึงเวอร์ชัน แถมยังมีสิทธิ์เขียนลงใน source tree แต่กลับอยู่ในช่องกรอกข้อความบน dashboard ซึ่งดูไม่เหมือน dependency เลย

อีกอย่างที่ทำให้ปัญหานี้แย่ลงคือ เราจะมองไม่เห็นมันจนกว่าจะพัง ในรีโปไม่มีอะไรระบุถึง `wrangler` ไม่มีรายการใน lockfile ไม่มีเลขเวอร์ชันในไฟล์ config และไม่มีอะไรให้ตรวจตอน review pull request ที่เดียวที่บันทึก dependency ตัวนี้ไว้คือช่องกรอกข้อความในหน้าตั้งค่า

## วิธีแก้คือหยุดปล่อยให้เครื่องมือเดาเอง

Wrangler เริ่มทำ auto-config เพราะหาไฟล์ config ไม่เจอ วิธีแก้จึงเป็นการเพิ่มไฟล์นั้นเข้าไป เว็บนี้ prerender ไว้ทั้งหมด สิ่งที่ต้องใช้จึงเป็น Worker แบบ assets-only โดยไม่มี server entrypoint:

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

ชื่อและค่า compatibility ไม่ได้มาจากการเดา ผมอ่านค่าทั้งหมดจาก Worker เวอร์ชันที่ให้บริการบน production อยู่จริง:

```sh
wrangler versions view <version-id> --name blog
# Compatibility Date:   2026-08-26
# Compatibility Flags:  global_fetch_strictly_public
```

เวอร์ชันนั้นไม่มี bindings อยู่เลย จึงมั่นใจได้ว่า Worker แบบ assets-only เป็นเป้าหมายที่ปลอดภัย ผมไม่ได้เอา static file server ไปแทน server เดิม แต่เพียงเขียนสิ่งที่ใช้งานอยู่แล้วให้ชัดเจนลงในไฟล์ config

ก่อน push ผมใช้ `--dry-run` ตรวจว่า config ใช้งานได้ และยืนยันว่า auto-config ไม่ทำงานอีก:

```sh
wrangler deploy --dry-run
# ✨ Read 42 files from the assets directory .../dist
# Total Upload: 0.40 KiB / gzip: 0.28 KiB
# No bindings found.
```

หลังจากนั้น การ push ครั้งถัดไป build และ deploy สำเร็จในเวลาประมาณสี่นาที

## สิ่งที่ผมได้จากเรื่องนี้

**prompt ที่ระบบตอบเองก็คือการเปลี่ยน config รูปแบบหนึ่ง** ข้อความ `🤖 Using fallback value in non-interactive context: yes` หมายความว่าเครื่องมือกำลังตัดสินใจแทนเรา ในสภาพแวดล้อมเดียวที่ไม่มีมนุษย์อยู่คัดค้าน ขั้นตอน setup ที่มีสิทธิ์แก้ไฟล์จะกำหนดค่า fallback เป็น `no` ก็ดูสมเหตุสมผล แต่มันกลับเลือก `yes` ทั้งที่เพิ่งเตือนเองว่าการตั้งค่านี้อาจใช้ไม่ได้

**`npx <tool>` ใน deploy command คือ dependency ที่คุณไม่ได้ติดตาม** ถ้าขั้นตอนหนึ่งใน pipeline ดาวน์โหลดเวอร์ชันล่าสุดของเครื่องมือเองทุกครั้ง deployment ของคุณก็ผูกอยู่กับรอบการออก release ของคนอื่น ทางเลือกคือ pin เวอร์ชันไว้ หรือเตรียมไฟล์ config ให้พร้อมเพื่อลดสิ่งที่เครื่องมือต้องตัดสินใจเอง

**เครื่องมือที่ build โปรเจกต์ซ้ำไม่ได้ทำหน้าที่แค่ deploy** เดิมผมเข้าใจว่า `wrangler deploy` เพียงอัปโหลดไฟล์ใน `dist/` แต่สิ่งที่มันทำจริงคือรัน `astro add` ติดตั้ง dependency แก้ `.gitignore` แล้ว build ใหม่จาก source ดังนั้น build ที่พังจึงไม่ใช่ build ที่ผมกำหนดไว้

**เมื่อวานผ่าน ไม่ได้แปลว่าวันนี้จะผ่าน** คำถามที่ช่วยหาสาเหตุไม่ใช่ “commit นี้เปลี่ยน build config หรือเปล่า” เพราะมันไม่ได้เปลี่ยน แต่คือ “pipeline นี้รันจริงครั้งล่าสุดเมื่อไร” สามสัปดาห์ที่ไม่ได้ deploy คือสามสัปดาห์ที่ dependency เปลี่ยนไปโดยผมมองไม่เห็น

## สิ่งที่ผมไม่ได้ฟันธง

ผมไม่รู้ว่า Wrangler เวอร์ชันใดทำงานเมื่อวันที่ 27 สิงหาคม เพราะไม่ได้เก็บ log ครั้งนั้นไว้ จึงชี้ไปที่ release ใด release หนึ่งแล้วบอกว่าเป็นจุดเริ่มต้นของพฤติกรรมนี้ไม่ได้ บอกได้เพียงว่าพฤติกรรมนี้ยังไม่เกิดขึ้นตอนที่ pipeline ทำงานสำเร็จครั้งล่าสุด แต่หลังจากนั้นกลับเกิดขึ้นสองครั้งติดต่อกัน

ผมยังไม่ได้ทดสอบด้วยว่า Astro เวอร์ชันที่รองรับอย่างเป็นทางการจะผ่าน auto-config หรือไม่ ซึ่งอาจผ่านก็ได้ เพราะปัญหานี้เกิดจากความไม่เข้ากันระหว่าง adapter กับ Astro 7.2.9 โดยเฉพาะ และ Wrangler ก็แจ้งเรื่องนี้ไว้แล้ว วิธีแก้ของผมเป็นการเลี่ยงคำถามนั้น ไม่ใช่การหาคำตอบ สำหรับบล็อกหนึ่งเว็บ นี่เป็นทางเลือกที่เหมาะสม แต่สำหรับระบบที่ต้องมีคน on-call อาจไม่ใช่

ไฟล์ config นี้ยังไม่ได้แก้ปัญหาที่ลึกกว่านั้น เพราะ deploy command ยังคงใช้ `npx wrangler` และดาวน์โหลด Wrangler เวอร์ชันล่าสุดใหม่ทุกครั้ง สิ่งที่ผมทำมีเพียงเอาการตัดสินใจที่มันเคยตัดสินใจพลาดออกไป ถ้าต้องการแก้ให้รัดกุมกว่านี้ ควร pin Wrangler เป็น devDependency แล้วเรียกใช้ binary ที่ติดตั้งไว้ในโปรเจกต์
