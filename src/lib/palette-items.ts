import type { PaletteItem } from "../scripts/palette";
import { site } from "../site";
import { getPosts } from "./content";
import { allTags, postUrl, readableDate, tagUrl } from "./posts";

/** Everything the command palette can find, computed at build time. */
export async function getPaletteItems(): Promise<PaletteItem[]> {
	const posts = await getPosts();
	return [
		...posts.map((post) => ({
			id: `post:${post.id}`,
			title: post.data.title,
			group: "writing" as const,
			url: postUrl(post),
			hint: readableDate(post.data.date, "month"),
			keywords: [...post.data.tags, ...(post.data.description ? [post.data.description] : [])],
		})),
		{ id: "page:home", title: "Home", group: "pages", url: "/", hint: "~/" },
		{ id: "page:writing", title: "Writing", group: "pages", url: "/blog/", hint: "~/writing", keywords: ["blog", "archive", "posts"] },
		{ id: "page:tags", title: "Tags", group: "pages", url: "/tags/", hint: "~/tags" },
		{ id: "page:about", title: "About", group: "pages", url: "/about/", hint: "~/about", keywords: ["me", "bio", "whoami"] },
		...allTags(posts).map((tag) => ({
			id: `tag:${tag}`,
			title: `#${tag}`,
			group: "pages" as const,
			url: tagUrl(tag),
			hint: "tag",
			keywords: [tag],
		})),
		{ id: "action:theme", title: "Toggle theme", group: "actions", action: "toggle-theme", hint: "light / dark", keywords: ["dark", "light", "mode"] },
		{ id: "action:email", title: "Copy email address", group: "actions", action: "copy-email", hint: "action", keywords: ["mail", "contact"] },
		{ id: "action:github", title: "Open GitHub", group: "actions", url: site.links.github, external: true, hint: "↗", keywords: ["code", "source"] },
		{ id: "action:signal", title: "Message on Signal", group: "actions", url: site.links.signal, external: true, hint: "↗", keywords: ["contact", "chat"] },
		{ id: "action:feed", title: "Subscribe via RSS / Atom", group: "actions", url: "/feed/feed.xml", hint: "feed", keywords: ["rss", "atom", "subscribe"] },
		{ id: "action:cat", title: "Pet the cat 🐾", group: "actions", action: "pet-cat", hint: "action", keywords: ["cat", "pet", "meow"] },
	];
}
