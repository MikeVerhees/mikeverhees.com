<script lang="ts">
	// Svelte island (client:visible). A tiny terminal: type `help`.
	// Command parsing lives in ../scripts/terminal.ts so it can be unit tested.
	import { onMount, tick } from "svelte";
	import { EVENTS, emit } from "../scripts/events";
	import { complete, run, type TerminalContext } from "../scripts/terminal";

	interface Props {
		context: TerminalContext;
	}
	let { context }: Props = $props();

	type Line = { kind: "in" | "out"; text: string };

	let ready = $state(false);
	let value = $state("");
	let lines = $state<Line[]>([{ kind: "out", text: "Type `help` to see what this terminal can do." }]);
	let history: string[] = [];
	let historyIndex = 0;
	let input: HTMLInputElement | undefined = $state();
	let screen: HTMLDivElement | undefined = $state();

	async function submit() {
		const command = value;
		value = "";
		if (command.trim()) history.push(command);
		historyIndex = history.length;

		const result = run(command, context);
		if (result.effect?.type === "clear") {
			lines = [];
		} else {
			lines = [...lines, { kind: "in", text: command }, ...result.output.map((text) => ({ kind: "out" as const, text }))];
		}

		switch (result.effect?.type) {
			case "navigate":
				if (result.effect.external && !result.effect.url.startsWith("mailto:")) window.open(result.effect.url, "_blank", "noopener");
				else window.location.href = result.effect.url;
				break;
			case "pet-cat":
				emit(EVENTS.petCat);
				break;
			case "toggle-theme":
				emit(EVENTS.toggleTheme);
				break;
		}

		await tick();
		screen?.scrollTo({ top: screen.scrollHeight });
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			event.preventDefault();
			submit();
		} else if (event.key === "ArrowUp" && history.length) {
			event.preventDefault();
			historyIndex = Math.max(0, historyIndex - 1);
			value = history[historyIndex];
		} else if (event.key === "ArrowDown" && history.length) {
			event.preventDefault();
			historyIndex = Math.min(history.length, historyIndex + 1);
			value = history[historyIndex] ?? "";
		} else if (event.key === "Tab" && value) {
			const completion = complete(value, context);
			if (completion) {
				event.preventDefault();
				value = completion;
			}
		} else if (event.key === "l" && event.ctrlKey) {
			event.preventDefault();
			lines = [];
		}
	}

	onMount(() => {
		ready = true;
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="terminal mono" onclick={() => input?.focus()}>
	<div class="screen" bind:this={screen} role="log" aria-live="polite" aria-label="Terminal output">
		{#each lines as line, i (i)}
			{#if line.kind === "in"}
				<div><span class="prompt" aria-hidden="true">$</span> {line.text}</div>
			{:else}
				<div class="out">{line.text}</div>
			{/if}
		{/each}
	</div>
	<label class="input-row">
		<span class="prompt" aria-hidden="true">$</span>
		<span class="visually-hidden">Terminal command</span>
		<input
			bind:this={input}
			bind:value
			onkeydown={onKeydown}
			disabled={!ready}
			placeholder={ready ? "type a command, e.g. help" : "this terminal needs JavaScript"}
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			enterkeyhint="send"
		/>
	</label>
</div>

<style>
	.terminal {
		font-size: 0.92rem;
		line-height: 1.7;
		cursor: text;
	}
	.screen {
		max-height: 240px;
		overflow-y: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.prompt {
		color: var(--accent);
	}
	.out {
		color: var(--muted);
	}
	.input-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: none;
		color: var(--fg);
		font: inherit;
		caret-color: var(--accent);
	}
	input::placeholder {
		color: var(--muted);
		opacity: 0.8;
	}
</style>
