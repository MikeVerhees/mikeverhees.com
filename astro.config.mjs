// @ts-check

import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://mikeverhees.com",
	// Fully static: every page is prerendered to plain HTML at build time.
	// Svelte components render to HTML at build time too; only those marked
	// with a client:* directive ship JavaScript (islands).
	output: "static",
	trailingSlash: "ignore",
	integrations: [svelte()],
	markdown: {
		shikiConfig: {
			themes: { light: "github-light", dark: "github-dark" },
			// Emit --shiki-light/--shiki-dark variables instead of inline colors,
			// so global.css can switch them with light-dark() (see Tokens there).
			defaultColor: false,
		},
	},
});
