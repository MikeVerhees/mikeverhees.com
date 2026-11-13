// Pure helpers for working with blog posts. Kept free of Astro imports so they
// can be unit tested with plain Vitest.

export interface PostLike {
	id: string;
	data: {
		title: string;
		date: Date;
		tags: string[];
		draft: boolean;
	};
}

/** Drafts are only included when `includeDrafts` is true (dev server). */
export function publishedPosts<T extends PostLike>(posts: T[], includeDrafts = false): T[] {
	return posts.filter((post) => includeDrafts || !post.data.draft);
}

/** Newest first. Does not mutate the input. */
export function sortByDateDesc<T extends PostLike>(posts: T[]): T[] {
	return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function slugify(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Unique tags across all posts, sorted alphabetically. */
export function allTags(posts: PostLike[]): string[] {
	const tags = new Set<string>();
	for (const post of posts) {
		for (const tag of post.data.tags) tags.add(tag);
	}
	return [...tags].sort((a, b) => a.localeCompare(b));
}

export function postsWithTag<T extends PostLike>(posts: T[], tag: string): T[] {
	const wanted = slugify(tag);
	return posts.filter((post) => post.data.tags.some((t) => slugify(t) === wanted));
}

export function postUrl(post: Pick<PostLike, "id">): string {
	return `/blog/${post.id}/`;
}

export function tagUrl(tag: string): string {
	return `/tags/${slugify(tag)}/`;
}

/** "11 March 2026" style, in UTC so builds are deterministic. */
export function readableDate(date: Date, style: "day" | "month" = "day"): string {
	return date.toLocaleDateString("en-GB", {
		timeZone: "UTC",
		...(style === "day" ? { day: "2-digit" } : {}),
		month: "long",
		year: "numeric",
	});
}

/** yyyy-mm-dd, for <time datetime> and sitemaps. */
export function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}
