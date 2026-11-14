<script lang="ts">
	// Svelte island (client:visible). An ASCII cat that naps and wakes up when
	// petted: by clicking it, from the command palette, or with `pet` in the terminal.
	import { onMount } from "svelte";
	import { EVENTS } from "../scripts/events";

	// Plain text art, drawn in the monospace font. Each frame is five lines.
	const NAPPING = ["  /\\_/\\", " ( -.- )", "  > ^ <", " /     \\_", "(_|_ _|_)"];
	const AWAKE = ["  /\\_/\\", " ( o.o )", "  > ^ <", " /     \\_", "(_|_ _|_)"];

	let awake = $state(false);
	let pets = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function pet() {
		awake = true;
		pets += 1;
		clearTimeout(timer);
		timer = setTimeout(() => (awake = false), 3500);
	}

	onMount(() => {
		window.addEventListener(EVENTS.petCat, pet);
		return () => {
			window.removeEventListener(EVENTS.petCat, pet);
			clearTimeout(timer);
		};
	});
</script>

<button type="button" class="cat" class:awake onclick={pet} aria-label="Pet the cat" aria-describedby="cat-status">
	<pre class="art" aria-hidden="true">{(awake ? AWAKE : NAPPING).join("\n")}</pre>
	<span class="bubble mono" aria-hidden="true">{awake ? "♥ prrr" : "z Z z"}</span>
</button>
<p id="cat-status" class="status" aria-live="polite">
	{#if awake}purring{pets > 1 ? ` (petted ${pets}×)` : ""} 🐾{:else}napping · click to pet{/if}
</p>

<style>
	.cat {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		cursor: pointer;
	}
	.art {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--fg);
		text-align: left;
	}
	.bubble {
		margin-bottom: 72px;
		font-size: 0.85rem;
		color: var(--accent);
		animation: float 3s ease-in-out infinite;
	}
	.awake .art {
		animation: wiggle 0.35s ease-in-out 2;
	}
	.status {
		margin: 8px 0 0;
		font-size: 0.9rem;
		color: var(--muted);
	}
	@keyframes float {
		50% {
			transform: translateY(-6px);
		}
	}
	@keyframes wiggle {
		25% {
			transform: rotate(-4deg);
		}
		75% {
			transform: rotate(4deg);
		}
	}
</style>
