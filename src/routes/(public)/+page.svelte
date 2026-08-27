<script lang="ts">
	import { resolve } from '$app/paths';
	import Archive from '@lucide/svelte/icons/archive';
	import Lock from '@lucide/svelte/icons/lock';
	import MonitorPlay from '@lucide/svelte/icons/monitor-play';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ConferenceCard from '$lib/components/conference-card.svelte';
	import FeatureCard from '$lib/components/feature-card.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section class="relative overflow-hidden bg-linear-to-br from-hero-from via-hero-via to-hero-to">
	<div class="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
		<div class="flex flex-col gap-6 text-hero-foreground">
			<Badge
				variant="outline"
				class="w-fit border-hero-foreground/30 tracking-wide text-hero-foreground/90 uppercase"
			>
				Vzdělávací platforma
			</Badge>
			<h1 class="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
				Online konference Nemocnice Beroun
			</h1>
			<p class="max-w-md text-hero-foreground/80">
				Odborné přednášky pro lékaře a zdravotnický personál. Po uhrazení účastnického poplatku vám
				přidělíme přístup ke konkrétní konferenci.
			</p>
			<Button
				href={resolve('/konference')}
				size="lg"
				class="w-fit bg-background text-foreground hover:bg-background/90"
			>
				<Lock data-icon="inline-start" />
				Zobrazit konference
			</Button>
		</div>
		<div
			class="relative flex aspect-4/3 flex-col items-center justify-center gap-3 rounded-2xl border border-hero-foreground/15 bg-hero-foreground/5 text-hero-foreground/70 backdrop-blur"
		>
			<MonitorPlay class="size-12" />
			<p class="text-sm">Živý přenos a záznam přednášek</p>
		</div>
	</div>
</section>

<section class="mx-auto max-w-6xl px-6 py-16">
	<div class="grid gap-6 sm:grid-cols-3">
		<FeatureCard
			icon={ShieldCheck}
			title="Bezpečný přístup"
			description="Každá konference má svůj vlastní přístup. Zaplatíte jednu, nemáte automaticky ostatní."
		/>
		<FeatureCard
			icon={MonitorPlay}
			title="Live i záznam"
			description="Sledujte online v reálném čase, nebo si přednášku pusťte kdykoliv později ze záznamu."
		/>
		<FeatureCard
			icon={Archive}
			title="Přístup navždy"
			description="Jednou zakoupené konference vám zůstávají k dispozici — bez expirace, bez omezení."
		/>
	</div>
</section>

<section class="mx-auto max-w-6xl px-6 pb-20">
	<div class="grid items-center gap-10 lg:grid-cols-2">
		<div class="relative aspect-4/3 overflow-hidden rounded-2xl">
			<img
				src="/images/prednaska.png"
				alt="Přednáška pro zdravotnický personál v Nemocnici Beroun"
				class="h-full w-full object-cover"
			/>
			<div
				class="absolute inset-0 bg-linear-to-tl from-primary/40 via-primary/10 to-transparent"
			></div>
		</div>
		<div class="flex flex-col gap-4">
			<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
				Odborný obsah pod vedením specialistů Nemocnice Beroun
			</h2>
			<p class="text-muted-foreground">
				Přednášky připravují a vedou lékaři a odborníci přímo z Nemocnice Beroun. Obsah je určený
				pro zdravotnický personál, který si chce doplnit a prohloubit odborné znalosti přímo z
				praxe.
			</p>
			<p class="text-muted-foreground">
				Přednášky2 připravují a vedou lékaři a odborníci přímo z Nemocnice Beroun. Obsah je určený
				pro zdravotnický personál, který si chce doplnit a prohloubit odborné znalosti přímo z
				praxe.
			</p>
		</div>
	</div>
</section>

{#if data.conferences.length > 0}
	<section class="mx-auto max-w-6xl px-6 pb-20">
		<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
			<div>
				<h2 class="text-2xl font-bold">Poslední konference</h2>
			</div>
			<Button href={resolve('/konference')} variant="link" class="gap-1 px-0">
				Všechny konference
				<ArrowRight data-icon="inline-end" />
			</Button>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.conferences as conference (conference.id)}
				<ConferenceCard {conference} />
			{/each}
		</div>
	</section>
{/if}
