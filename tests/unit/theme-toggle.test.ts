import { describe, expect, it } from "bun:test";
import { render } from "svelte/server";
import ThemeToggle from "../../src/components/ThemeToggle.svelte";

describe("ThemeToggle (server render)", () => {
	const { body } = render(ThemeToggle);

	it("renders an accessible toggle button", () => {
		expect(body).toContain('type="button"');
		expect(body).toContain("Dark theme");
		expect(body).toContain('aria-pressed="false"');
	});

	it("is hidden until hydrated, so no-JS visitors don't see a dead button", () => {
		expect(body).toMatch(/<button[^>]*\shidden/);
	});
});
