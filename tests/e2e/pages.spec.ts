import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Every HTML page listed in the sitemap, plus the 404 page.
async function sitemapPaths(request: import("@playwright/test").APIRequestContext) {
	const xml = await (await request.get("/sitemap.xml")).text();
	return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

test("sitemap lists the core pages", async ({ request }) => {
	const paths = await sitemapPaths(request);
	expect(paths).toEqual(expect.arrayContaining(["/", "/blog/", "/tags/", "/about/"]));
});

test("every sitemap page loads with a title, heading and no console errors", async ({ page, request }) => {
	const errors: string[] = [];
	page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
	page.on("pageerror", (err) => errors.push(err.message));

	for (const path of await sitemapPaths(request)) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(200);
		await expect(page, path).toHaveTitle(/Mike Verhees/);
		await expect(page.locator("main h1").first(), path).toBeVisible();
	}
	expect(errors).toEqual([]);
});

test("home page shows the intro, cards and contact links", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { level: 1 })).toContainText("Software developer");
	for (const label of ["~/writing", "~/work", "~/stack", "~/contact", "~/terminal"]) {
		await expect(page.getByRole("heading", { name: label })).toBeVisible();
	}
	const contact = page.getByRole("region", { name: "~/contact" });
	await expect(contact.getByRole("link", { name: "Mail" })).toHaveAttribute("href", "mailto:mail@mikeverhees.com");
	await expect(contact.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/mikeverhees");
	await expect(page.getByRole("link", { name: "~/mikeverhees" })).toHaveAttribute("aria-current", "page");
});

test("about page renders the about text", async ({ page }) => {
	await page.goto("/about/");
	await expect(page.getByRole("heading", { name: "About me" })).toBeVisible();
	await expect(page.getByRole("link", { name: "about" })).toHaveAttribute("aria-current", "page");
});

test("unknown URLs get the 404 page", async ({ page }) => {
	const response = await page.goto("/does-not-exist/");
	expect(response?.status()).toBe(404);
	await expect(page.getByRole("heading", { name: /404/ })).toBeVisible();
});

test("feeds and robots.txt are served and well-formed", async ({ request }) => {
	const atom = await request.get("/feed/feed.xml");
	expect(atom.ok()).toBe(true);
	expect(await atom.text()).toMatch(/^<\?xml[\s\S]*<feed xmlns="http:\/\/www.w3.org\/2005\/Atom"[\s\S]*<\/feed>\s*$/);

	const json = await request.get("/feed/feed.json");
	expect(json.ok()).toBe(true);
	const feed = await json.json();
	expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
	expect(Array.isArray(feed.items)).toBe(true);

	const robots = await (await request.get("/robots.txt")).text();
	expect(robots).toContain("User-agent: GPTBot");
});

for (const path of ["/", "/blog/", "/tags/", "/about/", "/does-not-exist/"]) {
	for (const theme of ["light", "dark"] as const) {
		test(`no accessibility violations on ${path} (${theme})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: theme });
			await page.goto(path);
			const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
			expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
		});
	}
}
