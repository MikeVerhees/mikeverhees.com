import { describe, expect, it } from "bun:test";
import { render } from "svelte/server";
import Cat from "../../src/components/Cat.svelte";
import CommandPalette from "../../src/components/CommandPalette.svelte";

// Server renders: what visitors get before (or without) JavaScript.

describe("Cat", () => {
	const { body } = render(Cat);

	it("is a labelled button that starts napping", () => {
		expect(body).toContain('aria-label="Pet the cat"');
		expect(body).toContain("napping");
		expect(body).toContain('aria-live="polite"');
	});
});

describe("CommandPalette", () => {
	const { body } = render(CommandPalette, {
		props: { items: [{ id: "p", title: "Hello", group: "writing", url: "/blog/hello/" }], email: "x@example.com" },
	});

	it("hides its trigger until hydrated", () => {
		expect(body).toMatch(/<button[^>]*class="chip search[^"]*"[^>]*hidden/);
	});

	it("renders a closed dialog with a combobox", () => {
		expect(body).toContain("<dialog");
		expect(body).not.toMatch(/<dialog[^>]*\sopen/);
		expect(body).toContain('role="combobox"');
	});
});
