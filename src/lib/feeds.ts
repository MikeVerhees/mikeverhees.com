// Pure builders for the Atom feed, JSON feed and sitemap, so the output
// format can be unit tested without running a full Astro build.

export interface FeedSite {
	title: string;
	description: string;
	language: string;
	url: string;
	author: { name: string; email: string; url: string };
}

export interface FeedItem {
	title: string;
	/** Site-relative path, e.g. /blog/my-post/ */
	path: string;
	date: Date;
	html: string;
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function absolute(site: FeedSite, path: string): string {
	return new URL(path, site.url).href;
}

export function atomFeed(site: FeedSite, items: FeedItem[], buildDate = new Date()): string {
	const updated = items.length > 0 ? items[0].date : buildDate;
	const entries = items
		.map((item) => {
			const url = escapeXml(absolute(site, item.path));
			return `	<entry>
		<title>${escapeXml(item.title)}</title>
		<link href="${url}"/>
		<updated>${item.date.toISOString()}</updated>
		<id>${url}</id>
		<content type="html">${escapeXml(item.html)}</content>
	</entry>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(site.language)}">
	<title>${escapeXml(site.title)}</title>
	<subtitle>${escapeXml(site.description)}</subtitle>
	<link href="${escapeXml(absolute(site, "/feed/feed.xml"))}" rel="self"/>
	<link href="${escapeXml(site.url)}"/>
	<updated>${updated.toISOString()}</updated>
	<id>${escapeXml(site.url)}</id>
	<author>
		<name>${escapeXml(site.author.name)}</name>
		<email>${escapeXml(site.author.email)}</email>
	</author>
${entries}
</feed>
`;
}

export function jsonFeed(site: FeedSite, items: FeedItem[]) {
	return {
		version: "https://jsonfeed.org/version/1.1",
		title: site.title,
		language: site.language,
		home_page_url: site.url,
		feed_url: absolute(site, "/feed/feed.json"),
		description: site.description,
		authors: [{ name: site.author.name, url: site.author.url }],
		items: items.map((item) => {
			const url = absolute(site, item.path);
			return {
				id: url,
				url,
				title: item.title,
				content_html: item.html,
				date_published: item.date.toISOString(),
			};
		}),
	};
}

export interface SitemapEntry {
	path: string;
	lastmod?: Date;
}

export function sitemap(site: Pick<FeedSite, "url">, entries: SitemapEntry[]): string {
	const urls = entries
		.map((entry) => {
			const lastmod = entry.lastmod ? `\n		<lastmod>${entry.lastmod.toISOString().slice(0, 10)}</lastmod>` : "";
			return `	<url>\n		<loc>${escapeXml(new URL(entry.path, site.url).href)}</loc>${lastmod}\n	</url>`;
		})
		.join("\n");
	return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
