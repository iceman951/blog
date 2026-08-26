/**
 * Minimal XML-plist parser for powermetrics output.
 *
 * powermetrics -f plist emits a stream of standalone XML plists separated by
 * NUL bytes (documented in `powermetrics --help` under --format). We split on
 * 0x00 and parse each chunk independently.
 */

type PValue = string | number | boolean | Date | Uint8Array | PValue[] | { [k: string]: PValue }

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'"
}
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m])

/** Parse one XML plist document. */
export const parsePlist = (xml: string): PValue => {
	let i = 0

	const skipWs = () => {
		while (i < xml.length && /\s/.test(xml[i])) i++
	}

	/** Read the next tag, skipping declarations, doctypes and comments. */
	const nextTag = (): { name: string; selfClosing: boolean; closing: boolean } | null => {
		for (;;) {
			skipWs()
			const lt = xml.indexOf('<', i)
			if (lt === -1) return null
			if (xml.startsWith('<?', lt) || xml.startsWith('<!DOCTYPE', lt)) {
				i = xml.indexOf('>', lt) + 1
				continue
			}
			if (xml.startsWith('<!--', lt)) {
				i = xml.indexOf('-->', lt) + 3
				continue
			}
			const gt = xml.indexOf('>', lt)
			if (gt === -1) return null
			const raw = xml.slice(lt + 1, gt)
			i = gt + 1
			const closing = raw.startsWith('/')
			const selfClosing = raw.endsWith('/')
			const name = raw.replace(/^\//, '').replace(/\/$/, '').split(/\s/)[0]
			return { name, selfClosing, closing }
		}
	}

	/** Text up to the matching close tag. */
	const textUntilClose = (tag: string) => {
		const close = `</${tag}>`
		const end = xml.indexOf(close, i)
		const text = xml.slice(i, end === -1 ? xml.length : end)
		i = end === -1 ? xml.length : end + close.length
		return decode(text)
	}

	const parseValue = (tag: { name: string; selfClosing: boolean }): PValue => {
		switch (tag.name) {
			case 'dict': {
				const out: Record<string, PValue> = {}
				if (tag.selfClosing) return out
				for (;;) {
					const t = nextTag()
					if (!t || (t.closing && t.name === 'dict')) return out
					if (t.name !== 'key') continue
					const key = textUntilClose('key')
					const vt = nextTag()
					if (!vt) return out
					out[key] = parseValue(vt)
				}
			}
			case 'array': {
				const out: PValue[] = []
				if (tag.selfClosing) return out
				for (;;) {
					const t = nextTag()
					if (!t || (t.closing && t.name === 'array')) return out
					out.push(parseValue(t))
				}
			}
			case 'string':
				return tag.selfClosing ? '' : textUntilClose('string')
			case 'integer':
				return tag.selfClosing ? 0 : Number(textUntilClose('integer'))
			case 'real':
				return tag.selfClosing ? 0 : Number(textUntilClose('real'))
			case 'true':
				return true
			case 'false':
				return false
			case 'date':
				return tag.selfClosing ? new Date(0) : new Date(textUntilClose('date'))
			case 'data':
				return tag.selfClosing ? '' : textUntilClose('data').replace(/\s+/g, '')
			default:
				return tag.selfClosing ? '' : textUntilClose(tag.name)
		}
	}

	for (;;) {
		const t = nextTag()
		if (!t) throw new Error('no plist root found')
		if (t.name === 'plist') continue
		return parseValue(t)
	}
}

/** Split a NUL-separated powermetrics plist stream into documents. */
export const splitSamples = (buf: Uint8Array): string[] => {
	const decoder = new TextDecoder()
	const out: string[] = []
	let start = 0
	for (let i = 0; i < buf.length; i++) {
		if (buf[i] !== 0) continue
		if (i > start) out.push(decoder.decode(buf.subarray(start, i)))
		start = i + 1
	}
	if (start < buf.length) {
		const tail = decoder.decode(buf.subarray(start)).trim()
		// A truncated final document (sampler still running) is dropped.
		if (tail.endsWith('</plist>')) out.push(tail)
	}
	return out
}

export const readSamples = async (path: string) =>
	splitSamples(new Uint8Array(await Bun.file(path).arrayBuffer())).map(parsePlist) as Record<string, PValue>[]
