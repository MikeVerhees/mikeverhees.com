import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import PostList from "../../src/components/PostList.astro";

const post = (id: string, title: string, date: string) => ({
	id,
	collection: "blog",
	data: { title, date: new Date(date), tags: [], draft: false },
});

describe("PostList", () => {
	it("renders a numbered list of linked posts", async () => {
		const container = await AstroContainer.create();
		const html = await container.renderToString(PostList, {
			props: { posts: [post("second", "Second", "2026-02-01"), post("first", "First", "2026-01-01")] },
		});

		expect(html).toContain('href="/blog/second/"');
		expect(html).toContain(">Second</a>");
		expect(html).toContain('datetime="2026-02-01"');
		expect(html).toContain("February 2026");
		expect(html).toContain("counter-reset: start-from 3");
	});
});
