import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

// End-to-end tests run against the production build (`dist/`), served by
// `astro preview`, so they check exactly what gets deployed.
export default defineConfig({
	testDir: "tests/e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : "list",
	expect: {
		toHaveScreenshot: { animations: "disabled", caret: "hide" },
	},
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "off",
		launchOptions: {
			...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
			args: ["--disable-gpu", "--force-color-profile=srgb", "--font-render-hinting=none"],
		},
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	webServer: {
		// --ignore-lock keeps the server in the foreground (Astro backgrounds it when run by a coding agent).
		command: `bunx --bun astro preview --port ${PORT} --ignore-lock`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
	},
});
