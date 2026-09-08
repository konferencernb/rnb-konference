<script lang="ts">
	import ConferenceCard from '$lib/components/conference-card.svelte';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Deaktivované konference</h1>
		<p class="mt-1 text-muted-foreground">
			Konference smazané z hlavního seznamu — nikde jinde v aplikaci se nezobrazují. Obnovením se
			zase objeví všude jako dřív.
		</p>
	</div>

	<h2 class="sr-only">Seznam deaktivovaných konferencí</h2>
	{#if data.conferences.length === 0}
		<Empty class="border border-dashed bg-card">
			<EmptyDescription>Žádná konference není deaktivovaná.</EmptyDescription>
		</Empty>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.conferences as conference (conference.id)}
				<ConferenceCard conference={{ ...conference, unlocked: true }} restoreAction="?/restore" />
			{/each}
		</div>
	{/if}
</div>
