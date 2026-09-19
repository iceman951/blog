import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Both collections share one naming rule: `foo.th.md` becomes `th/foo`, so
// a translation gets its own URL prefix without renaming the English file.
const localizedId = ({ entry }: { entry: string }) => {
	const base = entry.replace(/\.(md|mdx)$/, '');
	return base.endsWith('.th') ? `th/${base.slice(0, -'.th'.length)}` : base;
};

const series = defineCollection({
	loader: glob({
		base: './src/content/series',
		pattern: '**/*.{md,mdx}',
		generateId: localizedId,
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
	loader: glob({
		base: './src/content/blog',
		pattern: '**/*.{md,mdx}',
		generateId: localizedId,
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
				// Posts reference the English series id; `postsForSeries` matches the
				// Thai sibling (`th/<id>`) through the same key.
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
