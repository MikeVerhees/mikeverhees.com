// @ts-check
import { defineConfig } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://mikeverhees.com",
	// Fully static: every page is prerendered to plain HTML at build time.
	output: "static",
	trailingSlash: "ignore",
	markdown: {
		shikiConfig: {
			themes: { light: "github-light", dark: "github-dark" },
		},
	},
});
