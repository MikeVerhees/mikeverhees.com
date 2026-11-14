// Pure search logic for the command palette (no DOM), unit tested.

export type PaletteGroup = "writing" | "pages" | "actions";

export type PaletteAction = "toggle-theme" | "copy-email" | "pet-cat";

export interface PaletteItem {
	id: string;
	title: string;
	group: PaletteGroup;
	/** Navigate here when chosen. */
	url?: string;
	/** Or run this action. */
	action?: PaletteAction;
	/** Short text on the right, e.g. "post" or "#astro". */
	hint?: string;
	/** Extra words that should match, e.g. tags. */
	keywords?: string[];
	external?: boolean;
}

export const GROUP_LABELS: Record<PaletteGroup, string> = {
	writing: "~/writing",
	pages: "~/pages",
	actions: "~/actions",
};

const GROUP_ORDER: PaletteGroup[] = ["writing", "pages", "actions"];

function normalize(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase();
}

/**
 * Score how well `item` matches `query`. 0 means no match.
 * Every word in the query must appear somewhere in the title or keywords;
 * matches at the start of the title or a word rank higher.
 */
export function score(item: PaletteItem, query: string): number {
	const words = normalize(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return 1;

	const title = normalize(item.title);
	const keywords = (item.keywords ?? []).map(normalize);
	let total = 0;

	for (const word of words) {
		if (title.startsWith(word)) total += 6;
		else if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(title)) total += 4;
		else if (title.includes(word)) total += 2;
		else if (keywords.some((k) => k.startsWith(word))) total += 3;
		else if (keywords.some((k) => k.includes(word))) total += 1;
		else return 0;
	}
	return total;
}

/** Items matching `query`, grouped in a fixed order and best match first within each group. */
export function search(items: PaletteItem[], query: string): PaletteItem[] {
	const scored = items
		.map((item, index) => ({ item, index, score: score(item, query) }))
		.filter((entry) => entry.score > 0);

	return scored
		.sort(
			(a, b) =>
				GROUP_ORDER.indexOf(a.item.group) - GROUP_ORDER.indexOf(b.item.group) ||
				b.score - a.score ||
				a.index - b.index,
		)
		.map((entry) => entry.item);
}

/** Move the active index up or down, wrapping around. */
export function moveIndex(current: number, delta: number, length: number): number {
	if (length === 0) return -1;
	return (((current + delta) % length) + length) % length;
}

/** True for ⌘K on macOS and Ctrl+K elsewhere. */
export function isPaletteShortcut(event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">): boolean {
	return event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey;
}
