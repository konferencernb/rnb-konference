<script lang="ts">
	import { resolve } from '$app/paths';
	import Archive from '@lucide/svelte/icons/archive';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Lock from '@lucide/svelte/icons/lock';
	import MonitorPlay from '@lucide/svelte/icons/monitor-play';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ConferenceCard from '$lib/components/conference-card.svelte';
	import FeatureCard from '$lib/components/feature-card.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { conferences } from '$lib/data/conferences';
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
				Odborné přednášky pro lékaře a zdravotnický personál. Přístup získáte zadáním hesla, které
				jsme vám zaslali po uhrazení účastnického poplatku.
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
			title="Zabezpečený přístup"
			description="Každá konference má vlastní heslo. Odemknutí jedné akce neotevírá přístup k ostatním."
		/>
		<FeatureCard
			icon={MonitorPlay}
			title="Živé vysílání i záznam"
			description="Sledujte přenos v reálném čase. Po skončení se na stejném místě zobrazí záznam."
		/>
		<FeatureCard
			icon={Archive}
			title="Trvalý archiv"
			description="Starší konference zůstávají dostupné, stačí zadat původní přístupové heslo."
		/>
	</div>
</section>

<section class="mx-auto max-w-6xl px-6 py-16">
	<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h2 class="text-2xl font-bold">Aktuální konference</h2>
			<p class="text-muted-foreground">
				Nové odborné setkání připravujeme přibližně jednou měsíčně.
			</p>
		</div>
		<Button href={resolve('/konference')} variant="link" class="gap-1 px-0">
			Všechny konference
			<ArrowRight data-icon="inline-end" />
		</Button>
	</div>
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each conferences as conference (conference.slug)}
			<ConferenceCard {conference} />
		{/each}
	</div>
</section>
