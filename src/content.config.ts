import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	// `foo.th.mdx` becomes `th/foo` so Thai translations get their own URL
	// prefix without moving — and so breaking — the existing English posts.
	loader: glob({
		base: './src/content/blog',
		pattern: '**/*.{md,mdx}',
		generateId: ({ entry }) => {
			const base = entry.replace(/\.(md|mdx)$/, '');
			return base.endsWith('.th') ? `th/${base.slice(0, -'.th'.length)}` : base;
		},
	}),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			lang: z.enum(['en', 'th']).default('en'),
			// Posts sharing a translationKey are translations of one another.
			translationKey: z.string().optional(),
		}),
});

export const collections = { blog };
