import type { APIRoute } from "astro";
import { getPosts } from "../../lib/content";
import { toFeedItems } from "../../lib/feed-items";
import { atomFeed } from "../../lib/feeds";
import { site } from "../../site";

export const GET: APIRoute = async () => {
	const body = atomFeed(site, toFeedItems(await getPosts()));
	return new Response(body, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
};
