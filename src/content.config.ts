import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const series = defineCollection({
	loader: glob({
		base: './src/content/series',
		pattern: '**/*.{md,mdx}',
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		lang: z.enum(['en', 'th']).default('en'),
		featured: z.boolean().default(false),
		disclaimer: z.string().optional(),
	}),
});

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
	// Type-check frontmatter using a schema.
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),
				description: z.string(),
				pubDate: z.coerce.date(),
				updatedDate: z.coerce.date().optional(),
				heroImage: z.optional(image()),
				lang: z.enum(['en', 'th']).default('en'),
				tags: z.array(z.string()).optional(),
				translationKey: z.string().optional(),
				// Series fields are optional for ordinary posts, but must be used together.
				series: reference('series').optional(),
				seriesOrder: z.number().int().positive().optional(),
			})
			.superRefine((post, context) => {
				if (Boolean(post.series) === Boolean(post.seriesOrder)) return;
				context.addIssue({
					code: 'custom',
					message: 'series and seriesOrder must be provided together',
					path: [post.series ? 'seriesOrder' : 'series'],
				});
			}),
});

export const collections = { blog, series };
