import { describe, expect, it } from "vitest";
import { atomFeed, escapeXml, jsonFeed, sitemap, type FeedItem, type FeedSite } from "../../src/lib/feeds";

const site: FeedSite = {
	title: "Test & Site",
	description: "A <test> site",
	language: "en",
	url: "https://example.com/",
	author: { name: "Tester", email: "test@example.com", url: "https://example.com/" },
};

const items: FeedItem[] = [
	{ title: "Newest <post>", path: "/blog/newest/", date: new Date("2026-02-01T00:00:00Z"), html: "<p>Hi & bye</p>" },
	{ title: "Older", path: "/blog/older/", date: new Date("2026-01-01T00:00:00Z"), html: "<p>Old</p>" },
];

describe("escapeXml", () => {
	it("escapes all XML special characters", () => {
		expect(escapeXml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;");
	});
});

describe("atomFeed", () => {
	const xml = atomFeed(site, items);

	it("uses absolute URLs and escapes content", () => {
		expect(xml).toContain('<link href="https://example.com/feed/feed.xml" rel="self"/>');
		expect(xml).toContain("<id>https://example.com/blog/newest/</id>");
		expect(xml).toContain("<title>Newest &lt;post&gt;</title>");
		expect(xml).toContain("&lt;p&gt;Hi &amp; bye&lt;/p&gt;");
		expect(xml).toContain("<title>Test &amp; Site</title>");
	});

	it("is updated at the newest post's date", () => {
		expect(xml).toContain("<updated>2026-02-01T00:00:00.000Z</updated>");
	});

	it("falls back to the build date when there are no posts", () => {
		const empty = atomFeed(site, [], new Date("2026-11-13T00:00:00Z"));
		expect(empty).toContain("<updated>2026-11-13T00:00:00.000Z</updated>");
		expect(empty).not.toContain("<entry>");
	});
});

describe("jsonFeed", () => {
	it("follows JSON Feed 1.1", () => {
		const feed = jsonFeed(site, items);
		expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
		expect(feed.feed_url).toBe("https://example.com/feed/feed.json");
		expect(feed.items[0]).toEqual({
			id: "https://example.com/blog/newest/",
			url: "https://example.com/blog/newest/",
			title: "Newest <post>",
			content_html: "<p>Hi & bye</p>",
			date_published: "2026-02-01T00:00:00.000Z",
		});
	});
});

describe("sitemap", () => {
	it("lists absolute URLs with optional lastmod dates", () => {
		const xml = sitemap(site, [{ path: "/" }, { path: "/blog/x/", lastmod: new Date("2026-01-05T12:00:00Z") }]);
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<loc>https://example.com/blog/x/</loc>\n\t\t<lastmod>2026-01-05</lastmod>");
	});
});
