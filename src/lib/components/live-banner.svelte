<script lang="ts">
	import Play from '@lucide/svelte/icons/play';
	import X from '@lucide/svelte/icons/x';
	import { resolve } from '$app/paths';

	let { conference }: { conference: { id: string; title: string } | null } = $props();

	const DISMISSED_KEY = 'live-banner-dismissed';

	// Sticks past a reload for this specific live conference (so closing it
	// doesn't just come back the moment the page refreshes), but reappears on
	// its own the next time a *different* conference goes live — reading
	// localStorage has to happen client-side only, `window`/`localStorage`
	// don't exist during SSR.
	let dismissedId = $state<string | null>(null);

	$effect(() => {
		try {
			dismissedId = localStorage.getItem(DISMISSED_KEY);
		} catch {
			dismissedId = null;
		}
	});

	const visible = $derived(!!conference && conference.id !== dismissedId);

	function dismiss() {
		if (!conference) return;
		dismissedId = conference.id;
		try {
			localStorage.setItem(DISMISSED_KEY, conference.id);
		} catch {
			// Ignore — private browsing / storage disabled just means it won't
			// stick past a reload, not worth failing over.
		}
	}
</script>

{#if visible && conference}
	<div class="bg-destructive text-white">
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-2">
			<div class="flex min-w-0 items-center gap-2 text-sm">
				<span class="relative flex size-2 shrink-0">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
					></span>
					<span class="relative inline-flex size-2 rounded-full bg-white"></span>
				</span>
				<span class="shrink-0 font-semibold uppercase">Živě</span>
				<span class="h-4 w-px shrink-0 bg-white/40"></span>
				<span class="min-w-0 truncate">Právě vysíláme stream: {conference.title}</span>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<a
					href={resolve('/(public)/konference/[id]', { id: conference.id })}
					class="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-xs font-semibold whitespace-nowrap text-black hover:bg-white/90 sm:text-sm"
				>
					<Play class="size-3.5 fill-black" />
					Sledovat stream
				</a>
				<button
					type="button"
					aria-label="Zavřít"
					onclick={dismiss}
					class="cursor-pointer p-1 text-white/80 hover:text-white"
				>
					<X class="size-4" />
				</button>
			</div>
		</div>
	</div>
{/if}
