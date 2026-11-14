import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// A blog post is a Markdown file in src/content/blog/.
// Its file name (without extension) becomes the URL: /blog/<file-name>/
const blog = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		// Drafts show up with `bun run dev` but are left out of production builds.
		draft: z.boolean().default(false),
	}),
});

export const collections = { blog };
