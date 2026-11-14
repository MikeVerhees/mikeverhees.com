<script lang="ts">
	// Svelte island (client:visible). A pixel cat that naps and wakes up when
	// petted: by clicking it, from the command palette, or with `pet` in the terminal.
	import { onMount } from "svelte";
	import { EVENTS } from "../scripts/events";

	const PX = 10;
	// # fur, - closed eye, o open eye, p nose
	const BODY = [
		"..#.....#...",
		".###...###..",
		".#########..",
		"##########..",
		"#e#####e##..",
		"####pp####..",
		".########...",
		"..######....",
		".##########.",
		"############",
		"############",
		".##########.",
	];

	let awake = $state(false);
	let pets = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const pixels = BODY.flatMap((row, y) => [...row].map((c, x) => ({ c, x, y })).filter((p) => p.c !== "."));

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
	<svg viewBox="0 0 {12 * PX} {12 * PX}" width="96" height="96" aria-hidden="true">
		{#each pixels as p (p.x + "," + p.y)}
			{#if p.c === "#"}
				<rect x={p.x * PX} y={p.y * PX} width={PX} height={PX} class="fur" />
			{:else if p.c === "p"}
				<rect x={p.x * PX} y={p.y * PX} width={PX} height={PX} class="nose" />
			{:else if p.c === "e"}
				{#if awake}
					<rect x={p.x * PX} y={p.y * PX} width={PX} height={PX} class="eye" />
				{:else}
					<rect x={p.x * PX} y={p.y * PX} width={PX} height={PX} class="fur" />
					<rect x={p.x * PX} y={p.y * PX + 5} width={PX} height="2" class="eye" />
				{/if}
			{/if}
		{/each}
	</svg>
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
	.fur {
		fill: var(--fg);
		opacity: 0.85;
	}
	.eye {
		fill: var(--card-solid);
	}
	.nose {
		fill: #f472b6;
	}
	.bubble {
		margin-bottom: 64px;
		font-size: 0.85rem;
		color: var(--accent);
		animation: float 3s ease-in-out infinite;
	}
	.awake svg {
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
