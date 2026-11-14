<script lang="ts">
	// Svelte island (client:idle). A ⌘K / Ctrl+K command palette that searches
	// posts and pages and runs a few actions. Built on <dialog> for focus
	// trapping and Escape handling. All data is passed in at build time.
	import { onMount, tick } from "svelte";
	import { EVENTS, emit } from "../scripts/events";
	import { GROUP_LABELS, isPaletteShortcut, moveIndex, search, type PaletteItem } from "../scripts/palette";

	interface Props {
		items: PaletteItem[];
		email: string;
	}
	let { items, email }: Props = $props();

	let ready = $state(false);
	let open = $state(false);
	let query = $state("");
	let active = $state(0);
	let notice = $state("");
	let dialog: HTMLDialogElement | undefined = $state();
	let input: HTMLInputElement | undefined = $state();

	const results = $derived(search(items, query));
	const groups = $derived(
		results.reduce<{ label: string; items: { item: PaletteItem; index: number }[] }[]>((acc, item, index) => {
			const label = GROUP_LABELS[item.group];
			const last = acc.at(-1);
			if (last?.label === label) last.items.push({ item, index });
			else acc.push({ label, items: [{ item, index }] });
			return acc;
		}, []),
	);

	$effect(() => {
		// Reset the highlight whenever the query changes.
		query;
		active = 0;
	});

	async function show() {
		if (!dialog || open) return;
		query = "";
		notice = "";
		open = true;
		dialog.showModal();
		await tick();
		input?.focus();
	}

	function hide() {
		open = false;
		dialog?.close();
	}

	async function choose(item: PaletteItem | undefined) {
		if (!item) return;
		if (item.url) {
			hide();
			if (item.external) window.open(item.url, "_blank", "noopener");
			else window.location.href = item.url;
			return;
		}
		switch (item.action) {
			case "toggle-theme":
				emit(EVENTS.toggleTheme);
				hide();
				break;
			case "pet-cat":
				hide();
				if (document.getElementById("cat")) emit(EVENTS.petCat);
				else window.location.href = "/#cat";
				break;
			case "copy-email":
				try {
					await navigator.clipboard.writeText(email);
					notice = `Copied ${email}`;
				} catch {
					notice = email;
				}
				break;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			active = moveIndex(active, event.key === "ArrowDown" ? 1 : -1, results.length);
			document.getElementById(`palette-item-${active}`)?.scrollIntoView({ block: "nearest" });
		} else if (event.key === "Enter") {
			event.preventDefault();
			choose(results[active]);
		}
	}

	onMount(() => {
		ready = true;
		const onGlobalKey = (event: KeyboardEvent) => {
			if (isPaletteShortcut(event)) {
				event.preventDefault();
				open ? hide() : show();
			}
		};
		window.addEventListener("keydown", onGlobalKey);
		window.addEventListener(EVENTS.openPalette, show);
		return () => {
			window.removeEventListener("keydown", onGlobalKey);
			window.removeEventListener(EVENTS.openPalette, show);
		};
	});
</script>

<button type="button" class="chip search" hidden={!ready} onclick={show} aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K" aria-label="Search (⌘K)">
	<span aria-hidden="true">⌕</span>
	<span class="label">search…</span>
	<kbd aria-hidden="true">⌘K</kbd>
</button>

<dialog
	bind:this={dialog}
	class="palette"
	aria-label="Command palette"
	onclose={() => (open = false)}
	onclick={(event) => event.target === dialog && hide()}
>
	<div class="panel">
		<div class="input-row mono">
			<span aria-hidden="true">&gt;</span>
			<input
				bind:this={input}
				bind:value={query}
				onkeydown={onKeydown}
				type="text"
				role="combobox"
				aria-expanded="true"
				aria-controls="palette-list"
				aria-activedescendant={results.length ? `palette-item-${active}` : undefined}
				aria-autocomplete="list"
				aria-label="Search posts, pages and actions"
				placeholder="search posts, pages, actions…"
				autocomplete="off"
				spellcheck="false"
			/>
		</div>

		<div id="palette-list" role="listbox" aria-label="Results" class="list">
			{#each groups as group (group.label)}
				<div role="group" aria-label={group.label}>
					<div class="group-label mono" aria-hidden="true">{group.label}</div>
					{#each group.items as { item, index } (item.id)}
						<div
							id="palette-item-{index}"
							role="option"
							aria-selected={index === active}
							class="item"
							class:active={index === active}
							onclick={() => choose(item)}
							onmousemove={() => (active = index)}
						>
							<span>{item.title}</span>
							{#if item.hint}<small class="mono">{item.hint}</small>{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty">No matches for “{query}”.</p>
			{/each}
		</div>

		<div class="foot mono">
			<span aria-live="polite">{notice}</span>
			<span class="keys" aria-hidden="true">↑↓ navigate · ↵ open · esc close</span>
		</div>
	</div>
</dialog>

<style>
	.search kbd {
		margin-left: 8px;
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0 6px;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted);
	}
	.search .label {
		color: var(--muted);
	}
	@media (max-width: 760px) {
		.search .label,
		.search kbd {
			display: none;
		}
	}

	.palette {
		width: min(620px, calc(100vw - 32px));
		max-height: min(560px, calc(100vh - 160px));
		margin: 12vh auto auto;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: var(--card-solid);
		color: var(--fg);
		box-shadow: 0 30px 80px rgb(0 0 0 / 0.35);
		overflow: hidden;
	}
	.palette[open] {
		display: flex;
	}
	.palette::backdrop {
		background: rgb(5 8 15 / 0.45);
		backdrop-filter: blur(4px);
	}
	.panel {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: 0;
	}
	.input-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 18px;
		border-bottom: 1px solid var(--line);
		color: var(--muted);
	}
	.input-row input {
		flex: 1;
		border: 0;
		outline: 0;
		background: none;
		color: var(--fg);
		font: inherit;
		font-size: 1.05rem;
		caret-color: var(--accent);
	}
	.list {
		overflow-y: auto;
		padding: 6px 10px 10px;
	}
	.group-label {
		margin: 10px 8px 4px;
		font-size: 0.75rem;
		color: var(--muted);
	}
	.item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 9px 10px;
		border-radius: 8px;
		cursor: pointer;
	}
	.item small {
		color: var(--muted);
		white-space: nowrap;
	}
	.item.active {
		background: color-mix(in srgb, var(--accent) 16%, transparent);
	}
	.empty {
		margin: 16px 8px;
		color: var(--muted);
	}
	.foot {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 18px;
		border-top: 1px solid var(--line);
		font-size: 0.78rem;
		color: var(--muted);
	}
	@media (max-width: 760px) {
		.keys {
			display: none;
		}
	}
</style>
