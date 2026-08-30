<script lang="ts">
	import ConferenceCard from '$lib/components/conference-card.svelte';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Spinner } from '$lib/components/ui/spinner';
	import { shouldPlayIntroAnimation } from '$lib/intro-animation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Only animate the very first time this session — see intro-animation.ts.
	const playIntro = shouldPlayIntroAnimation();

	let conferences = $state(data.conferences);
	let hasMore = $state(data.hasMore);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLDivElement>();

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;

		const response = await fetch(`/api/konference?offset=${conferences.length}`);
		const page = await response.json();

		conferences = [...conferences, ...page.conferences];
		hasMore = page.hasMore;
		loadingMore = false;
	}

	$effect(() => {
		if (!sentinel || !hasMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) loadMore();
			},
			{ rootMargin: '400px' }
		);
		observer.observe(sentinel);

		return () => observer.disconnect();
	});
</script>

<section class="bg-linear-to-b from-accent-soft to-background">
	<div class="mx-auto max-w-6xl px-6 pt-16">
		<h1
			class="text-4xl font-bold tracking-tight {playIntro
				? 'animate-in duration-700 fade-in slide-in-from-top-4'
				: ''}"
		>
			Konference
		</h1>
	</div>
</section>

<section class="mx-auto max-w-6xl px-6 py-12">
	{#if conferences.length === 0}
		<Empty class="border border-dashed">
			<EmptyDescription>Zatím nejsou vypsané žádné konference.</EmptyDescription>
		</Empty>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each conferences as conference, i (conference.id)}
				<div
					class="h-full {playIntro
						? 'animate-in duration-700 fill-mode-both fade-in slide-in-from-top-4'
						: ''}"
					style:animation-delay={playIntro ? `${150 + (i % 12) * 80}ms` : undefined}
				>
					<ConferenceCard {conference} />
				</div>
			{/each}
		</div>
		{#if hasMore}
			<div bind:this={sentinel} class="mt-8 flex justify-center py-4">
				{#if loadingMore}
					<Spinner class="size-5 text-muted-foreground" />
				{/if}
			</div>
		{/if}
	{/if}
</section>
