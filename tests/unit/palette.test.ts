import { describe, expect, it } from "bun:test";
import { isPaletteShortcut, moveIndex, type PaletteItem, score, search } from "../../src/scripts/palette";

const items: PaletteItem[] = [
	{ id: "a", title: "Toggle theme", group: "actions", action: "toggle-theme", keywords: ["dark", "light"] },
	{ id: "p1", title: "Moving my site to Astro", group: "writing", url: "/blog/astro/", keywords: ["astro", "bun"] },
	{ id: "p2", title: "Svelte islands", group: "writing", url: "/blog/svelte/", keywords: ["astro", "svelte"] },
	{ id: "pg", title: "About", group: "pages", url: "/about/" },
	{ id: "c", title: "Pet the cat 🐾", group: "actions", action: "pet-cat" },
];

describe("score", () => {
	it("ranks title prefixes above word matches above substrings above keywords", () => {
		const item = { id: "x", title: "Astro islands", group: "writing", keywords: ["svelte"] } as PaletteItem;
		expect(score(item, "astro")).toBeGreaterThan(score(item, "islands"));
		expect(score(item, "islands")).toBeGreaterThan(score(item, "slands"));
		expect(score(item, "slands")).toBeGreaterThan(score(item, "vel"));
		expect(score(item, "svelte")).toBeGreaterThan(0);
	});

	it("requires every word to match", () => {
		expect(score(items[1], "astro site")).toBeGreaterThan(0);
		expect(score(items[1], "astro python")).toBe(0);
	});

	it("ignores case and accents", () => {
		expect(score({ id: "x", title: "Café notes", group: "writing" }, "CAFE")).toBeGreaterThan(0);
	});

	it("does not break on regex characters", () => {
		expect(score(items[0], "(")).toBe(0);
	});
});

describe("search", () => {
	it("returns everything for an empty query, grouped writing, pages, actions", () => {
		expect(search(items, "").map((i) => i.id)).toEqual(["p1", "p2", "pg", "a", "c"]);
	});

	it("puts the best match first within a group", () => {
		expect(search(items, "astro").map((i) => i.id)).toEqual(["p1", "p2"]);
	});

	it("finds actions by keyword", () => {
		expect(search(items, "dark").map((i) => i.id)).toEqual(["a"]);
	});
});

describe("moveIndex", () => {
	it("wraps around in both directions", () => {
		expect(moveIndex(0, -1, 3)).toBe(2);
		expect(moveIndex(2, 1, 3)).toBe(0);
		expect(moveIndex(1, 1, 3)).toBe(2);
		expect(moveIndex(0, 1, 0)).toBe(-1);
	});
});

describe("isPaletteShortcut", () => {
	const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, ...mods });

	it("accepts ⌘K and Ctrl+K", () => {
		expect(isPaletteShortcut(key("k", { metaKey: true }))).toBe(true);
		expect(isPaletteShortcut(key("K", { ctrlKey: true }))).toBe(true);
	});

	it("ignores plain K and Alt combinations", () => {
		expect(isPaletteShortcut(key("k"))).toBe(false);
		expect(isPaletteShortcut(key("k", { ctrlKey: true, altKey: true }))).toBe(false);
	});
});
