<script lang="ts">
	import ConferenceCard from '$lib/components/conference-card.svelte';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { archivedConferences, conferences } from '$lib/data/conferences';
</script>

<section class="border-b bg-linear-to-b from-accent-soft to-background">
	<div class="mx-auto max-w-6xl px-6 py-16">
		<h1 class="text-4xl font-bold tracking-tight">Konference</h1>
		<p class="mt-3 max-w-2xl text-muted-foreground">
			Vyberte konferenci a zadejte heslo, které jste obdrželi e-mailem. Přístup platí vždy pouze pro
			zvolenou konferenci.
		</p>
	</div>
</section>

<section class="mx-auto max-w-6xl px-6 py-12">
	<h2 class="mb-6 text-xl font-semibold">Aktuální a připravované</h2>
	{#if conferences.length === 0}
		<Empty class="border border-dashed">
			<EmptyDescription>Zatím nejsou vypsané žádné konference.</EmptyDescription>
		</Empty>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each conferences as conference (conference.slug)}
				<ConferenceCard {conference} />
			{/each}
		</div>
	{/if}
</section>

<section class="mx-auto max-w-6xl px-6 pb-16">
	<h2 class="mb-6 text-xl font-semibold">Archiv</h2>
	{#if archivedConferences.length === 0}
		<Empty class="border border-dashed">
			<EmptyDescription>Archiv je zatím prázdný.</EmptyDescription>
		</Empty>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each archivedConferences as conference (conference.slug)}
				<ConferenceCard {conference} />
			{/each}
		</div>
	{/if}
</section>
