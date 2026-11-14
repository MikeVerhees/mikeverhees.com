import { expect, test } from "@playwright/test";

test("toggle switches theme and remembers the choice", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.goto("/");

	const toggle = page.getByRole("button", { name: "Dark theme" });
	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(lightBackground);

	await page.goto("/blog/");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");
});

test("an explicit light choice wins over a dark system preference", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await page.goto("/");
	const toggle = page.getByRole("button", { name: "Dark theme" });
	await expect(toggle).toHaveAttribute("aria-pressed", "true");

	await toggle.click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
	await page.reload();
	await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "false");
});

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("the site still renders and the toggle stays hidden", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { level: 1 })).toContainText("Software developer");
		await expect(page.locator(".theme-toggle")).toBeHidden();
		await expect(page.locator(".search")).toBeHidden();
		await expect(page.getByRole("textbox", { name: "Terminal command" })).toBeDisabled();
	});
});
