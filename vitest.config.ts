/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// getViteConfig gives Vitest Astro's Vite setup, so tests can import .astro
// components and render them with the Container API.
export default getViteConfig({
	test: {
		include: ["tests/unit/**/*.test.ts"],
	},
});
