<script lang="ts">
	import { resolve } from '$app/paths';
	import Plus from '@lucide/svelte/icons/plus';
	import ConferenceCard from '$lib/components/conference-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let searchQuery = $state('');

	const filteredConferences = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return data.conferences;
		return data.conferences.filter((conference) => conference.title.toLowerCase().includes(query));
	});
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Konference</h1>
		<div class="flex items-center gap-2">
			<Input type="text" placeholder="Hledat podle názvu…" bind:value={searchQuery} class="w-80" />
			<Button href={resolve('/admin/konference/new')} size="icon" aria-label="Nová konference">
				<Plus class="size-4" />
			</Button>
		</div>
	</div>

	{#if data.conferences.length === 0}
		<Empty class="border border-dashed bg-card">
			<EmptyDescription
				>Zatím nemáte žádné konference. Vytvořte první pomocí tlačítka „+“.</EmptyDescription
			>
		</Empty>
	{:else if filteredConferences.length === 0}
		<Empty class="border border-dashed bg-card">
			<EmptyDescription>Nic nenalezeno.</EmptyDescription>
		</Empty>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredConferences as conference (conference.id)}
				<ConferenceCard
					conference={{ ...conference, unlocked: true }}
					editHref={resolve('/admin/(protected)/konference/[id]', { id: conference.id })}
				/>
			{/each}
		</div>
	{/if}
</div>
