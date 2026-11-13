import { currentTheme, nextTheme, STORAGE_KEY, type Theme } from "./theme";

function saveTheme(theme: Theme) {
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Storage can be unavailable (private mode, blocked cookies); the toggle still works for this page.
	}
}

export class ThemeToggle extends HTMLElement {
	#button: HTMLButtonElement | null = null;
	#media = window.matchMedia("(prefers-color-scheme: dark)");
	#onSystemChange = () => this.#render();

	connectedCallback() {
		this.#button = this.querySelector("button");
		if (!this.#button) return;
		this.#button.hidden = false;
		this.#button.addEventListener("click", this.#toggle);
		this.#media.addEventListener("change", this.#onSystemChange);
		this.#render();
	}

	disconnectedCallback() {
		this.#button?.removeEventListener("click", this.#toggle);
		this.#media.removeEventListener("change", this.#onSystemChange);
	}

	#toggle = () => {
		const root = document.documentElement;
		const theme = nextTheme(currentTheme(root, this.#media.matches));
		root.dataset.theme = theme;
		saveTheme(theme);
		this.#render();
	};

	#render() {
		const isDark = currentTheme(document.documentElement, this.#media.matches) === "dark";
		this.#button?.setAttribute("aria-pressed", String(isDark));
	}
}
