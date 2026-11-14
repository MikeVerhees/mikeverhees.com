// Islands talk to each other through window events, so each one can load on
// its own schedule and none of them import each other.
export const EVENTS = {
	toggleTheme: "site:toggle-theme",
	petCat: "site:pet-cat",
	openPalette: "site:open-palette",
} as const;

export type SiteEvent = (typeof EVENTS)[keyof typeof EVENTS];

export function emit(name: SiteEvent) {
	window.dispatchEvent(new CustomEvent(name));
}
