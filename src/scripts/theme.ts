// Pure theme logic, kept separate from the custom element so it can be unit tested without a DOM.

export type Theme = "light" | "dark";

export const STORAGE_KEY = "theme";

/** The theme currently in effect: an explicit choice, else the system preference. */
export function currentTheme(root: HTMLElement, prefersDark: boolean): Theme {
	const explicit = root.dataset.theme;
	if (explicit === "light" || explicit === "dark") return explicit;
	return prefersDark ? "dark" : "light";
}

export function nextTheme(theme: Theme): Theme {
	return theme === "dark" ? "light" : "dark";
}
