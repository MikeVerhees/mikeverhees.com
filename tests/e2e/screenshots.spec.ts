import { expect, test } from "@playwright/test";

// Fractional device scale factors (Pixel 7 uses 2.625) rasterize text
// non-deterministically; screenshots are compared at CSS scale, so pin DSF to 1.
test.use({ deviceScaleFactor: 1 });

const pages: Record<string, string> = {
	"/": "home",
	"/blog/": "blog",
	"/tags/": "tags",
	"/about/": "about",
	"/does-not-exist/": "404",
};

for (const [path, name] of Object.entries(pages)) {
	for (const theme of ["light", "dark"] as const) {
		test(`screenshot of ${name} in ${theme} theme`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: theme });
			await page.goto(path, { waitUntil: "networkidle" });
			await expect(page.locator(".theme-toggle")).toBeVisible();
			await expect(page.locator(".search")).toBeVisible();
			await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { fullPage: true });
		});
	}
}
