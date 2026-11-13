import { getCollection } from "astro:content";
import { publishedPosts, sortByDateDesc } from "./posts";

/** All posts that should appear on the site, newest first. */
export async function getPosts() {
	const posts = await getCollection("blog");
	return sortByDateDesc(publishedPosts(posts, import.meta.env.DEV));
}
