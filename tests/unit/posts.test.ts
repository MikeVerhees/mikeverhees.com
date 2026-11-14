import { describe, expect, it } from "bun:test";
import {
	allTags,
	isoDate,
	postsWithTag,
	postUrl,
	publishedPosts,
	readableDate,
	slugify,
	sortByDateDesc,
	tagUrl,
	type PostLike,
} from "../../src/lib/posts";

function post(id: string, date: string, opts: { tags?: string[]; draft?: boolean } = {}): PostLike {
	return { id, data: { title: id, date: new Date(date), tags: opts.tags ?? [], draft: opts.draft ?? false } };
}

describe("publishedPosts", () => {
	const posts = [post("live", "2026-01-01"), post("wip", "2026-02-01", { draft: true })];

	it("drops drafts by default (production builds)", () => {
		expect(publishedPosts(posts).map((p) => p.id)).toEqual(["live"]);
	});

	it("keeps drafts when asked (dev server)", () => {
		expect(publishedPosts(posts, true).map((p) => p.id)).toEqual(["live", "wip"]);
	});
});

describe("sortByDateDesc", () => {
	it("puts the newest post first without mutating the input", () => {
		const posts = [post("old", "2025-01-01"), post("new", "2026-06-01"), post("mid", "2025-12-01")];
		expect(sortByDateDesc(posts).map((p) => p.id)).toEqual(["new", "mid", "old"]);
		expect(posts.map((p) => p.id)).toEqual(["old", "new", "mid"]);
	});
});

describe("slugify", () => {
	it.each([
		["Hello World", "hello-world"],
		["  Web Components  ", "web-components"],
		["Café & Padel!", "cafe-padel"],
		["Astro 7.4", "astro-7-4"],
	])("%s -> %s", (input, expected) => {
		expect(slugify(input)).toBe(expected);
	});
});

describe("tags", () => {
	const posts = [
		post("a", "2026-01-01", { tags: ["web", "Astro"] }),
		post("b", "2026-01-02", { tags: ["web"] }),
		post("c", "2026-01-03"),
	];

	it("lists each tag once, sorted", () => {
		expect(allTags(posts)).toEqual(["Astro", "web"]);
	});

	it("finds posts by tag, matching on the slug", () => {
		expect(postsWithTag(posts, "astro").map((p) => p.id)).toEqual(["a"]);
		expect(postsWithTag(posts, "web").map((p) => p.id)).toEqual(["a", "b"]);
	});
});

describe("urls", () => {
	it("keeps the URL scheme of the old Eleventy site", () => {
		expect(postUrl({ id: "my-post" })).toBe("/blog/my-post/");
		expect(tagUrl("Web Dev")).toBe("/tags/web-dev/");
	});
});

describe("dates", () => {
	const date = new Date("2026-03-11T23:30:00Z");

	it("formats in UTC so the build doesn't depend on the machine's time zone", () => {
		expect(readableDate(date)).toBe("11 March 2026");
		expect(readableDate(date, "month")).toBe("March 2026");
		expect(isoDate(date)).toBe("2026-03-11");
	});
});
