import type { APIRoute } from "astro";
import { getPosts } from "../lib/content";
import { sitemap, type SitemapEntry } from "../lib/feeds";
import { allTags, postUrl, tagUrl } from "../lib/posts";
import { site } from "../site";

export const GET: APIRoute = async () => {
	const posts = await getPosts();
	const entries: SitemapEntry[] = [
		{ path: "/", lastmod: posts[0]?.data.date },
		{ path: "/blog/", lastmod: posts[0]?.data.date },
		{ path: "/tags/" },
		{ path: "/about/" },
		...posts.map((post) => ({ path: postUrl(post), lastmod: post.data.date })),
		...allTags(posts).map((tag) => ({ path: tagUrl(tag) })),
	];
	return new Response(sitemap(site, entries), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
