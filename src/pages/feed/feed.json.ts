import type { APIRoute } from "astro";
import { getPosts } from "../../lib/content";
import { toFeedItems } from "../../lib/feed-items";
import { jsonFeed } from "../../lib/feeds";
import { site } from "../../site";

export const GET: APIRoute = async () => {
	const body = JSON.stringify(jsonFeed(site, toFeedItems(await getPosts())), null, "\t");
	return new Response(body, { headers: { "Content-Type": "application/feed+json; charset=utf-8" } });
};
