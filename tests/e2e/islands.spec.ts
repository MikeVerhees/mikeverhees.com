import { expect, test, type Page } from "@playwright/test";

const terminalInput = (page: Page) => page.getByRole("textbox", { name: "Terminal command" });

async function openPalette(page: Page) {
	// The palette hydrates when the browser is idle; wait for its button first.
	await expect(page.getByRole("button", { name: /search/i })).toBeVisible();
	await page.keyboard.press("Control+k");
	await expect(page.getByRole("combobox")).toBeFocused();
}

async function typeCommand(page: Page, command: string) {
	const input = terminalInput(page);
	await input.scrollIntoViewIfNeeded();
	await expect(input).toBeEnabled();
	await input.fill(command);
	await input.press("Enter");
}

test.describe("command palette", () => {
	test("opens with Ctrl+K and the button, closes with Escape", async ({ page }) => {
		await page.goto("/");
		const dialog = page.getByRole("dialog", { name: "Command palette" });

		await openPalette(page);
		await expect(dialog).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();

		await page.getByRole("button", { name: /search/i }).click();
		await expect(dialog).toBeVisible();
		await expect(page.getByRole("combobox")).toBeFocused();
	});

	test("searches pages and navigates with the keyboard", async ({ page }) => {
		await page.goto("/");
		await openPalette(page);
		await page.getByRole("combobox").fill("about");
		await expect(page.getByRole("option").first()).toHaveText(/About/);
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/\/about\/$/);
	});

	test("shows an empty state", async ({ page }) => {
		await page.goto("/");
		await openPalette(page);
		await page.getByRole("combobox").fill("zzzqqq");
		await expect(page.getByText("No matches")).toBeVisible();
	});

	test("runs actions: toggle theme and pet the cat", async ({ page }) => {
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/");
		await openPalette(page);
		await page.getByRole("combobox").fill("toggle theme");
		await page.keyboard.press("Enter");
		await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

		await page.locator("#cat").scrollIntoViewIfNeeded();
		await expect(page.getByRole("button", { name: "Pet the cat" })).toBeVisible();
		await openPalette(page);
		await page.getByRole("combobox").fill("pet");
		await page.keyboard.press("Enter");
		await expect(page.locator("#cat-status")).toContainText("purring");
	});
});

test.describe("cat", () => {
	test("wakes up when petted and naps again", async ({ page }) => {
		await page.clock.install();
		await page.goto("/");
		const status = page.locator("#cat-status");
		await expect(status).toContainText("napping");
		await page.getByRole("button", { name: "Pet the cat" }).click();
		await expect(status).toContainText("purring");
		await page.clock.runFor(4000);
		await expect(status).toContainText("napping");
	});
});

test.describe("terminal", () => {
	test("runs commands and keeps history", async ({ page }) => {
		await page.goto("/");
		const log = page.getByRole("log", { name: "Terminal output" });

		await typeCommand(page, "help");
		await expect(log).toContainText("pet the cat");

		await typeCommand(page, "stack");
		await expect(log).toContainText("TypeScript · JavaScript");

		await typeCommand(page, "nonsense");
		await expect(log).toContainText("command not found: nonsense");

		await terminalInput(page).press("ArrowUp");
		await expect(terminalInput(page)).toHaveValue("nonsense");

		await typeCommand(page, "clear");
		await expect(log).not.toContainText("command not found");
	});

	test("tab completes and pets the cat", async ({ page }) => {
		await page.goto("/");
		const input = terminalInput(page);
		await input.scrollIntoViewIfNeeded();
		await expect(input).toBeEnabled();
		await input.fill("pe");
		await input.press("Tab");
		await expect(input).toHaveValue("pet ");
		await input.press("Enter");
		await expect(page.locator("#cat-status")).toContainText("purring");
	});

	test("navigates with open", async ({ page }) => {
		await page.goto("/");
		await typeCommand(page, "open writing");
		await expect(page).toHaveURL(/\/blog\/$/);
	});
});
