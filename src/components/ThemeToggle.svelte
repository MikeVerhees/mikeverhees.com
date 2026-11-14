<script lang="ts">
	// Svelte island, hydrated with client:load in Base.astro.
	// The server-rendered button stays hidden until hydration, so visitors
	// without JavaScript simply get their system color scheme.
	import { onMount } from "svelte";
	import { EVENTS } from "../scripts/events";
	import { currentTheme, nextTheme, STORAGE_KEY, type Theme } from "../scripts/theme";

	let ready = $state(false);
	let theme = $state<Theme>("light");

	function saveTheme(value: Theme) {
		try {
			localStorage.setItem(STORAGE_KEY, value);
		} catch {
			// Storage can be unavailable (private mode, blocked cookies); the toggle still works for this page.
		}
	}

	function toggle() {
		theme = nextTheme(theme);
		document.documentElement.dataset.theme = theme;
		saveTheme(theme);
	}

	onMount(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const sync = () => (theme = currentTheme(document.documentElement, media.matches));
		sync();
		ready = true;
		media.addEventListener("change", sync);
		// Other islands (command palette, terminal) can ask for a toggle.
		window.addEventListener(EVENTS.toggleTheme, toggle);
		return () => {
			media.removeEventListener("change", sync);
			window.removeEventListener(EVENTS.toggleTheme, toggle);
		};
	});
</script>

<button type="button" class="chip theme-toggle" hidden={!ready} aria-pressed={theme === "dark"} onclick={toggle}>
	<span class="visually-hidden">Dark theme</span>
	<span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
</button>
