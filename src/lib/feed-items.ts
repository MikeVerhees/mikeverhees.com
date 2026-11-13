import type { CollectionEntry } from "astro:content";
import type { FeedItem } from "./feeds";
import { postUrl } from "./posts";

export function toFeedItems(posts: CollectionEntry<"blog">[]): FeedItem[] {
	return posts.map((post) => ({
		title: post.data.title,
		path: postUrl(post),
		date: post.data.date,
		html: post.rendered?.html ?? "",
	}));
}
