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
	import { shouldPlayIntroAnimation } from '$lib/intro-animation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Only animate the very first time this session — see intro-animation.ts.
	const playIntro = shouldPlayIntroAnimation();

	// Below-the-fold sections only start their entrance animation once
	// scrolled into view — a plain mount-triggered animation would already
	// have finished playing (invisibly) long before the user scrolls down to
	// see it. Mirrors the IntersectionObserver pattern already used for
	// infinite-scroll loading on /konference. A no-op once playIntro is
	// false — nothing left to reveal, the content just renders in place.
	function revealOnScroll(node: HTMLElement, setVisible: (visible: boolean) => void) {
		if (!playIntro) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				setVisible(true);
				observer.disconnect();
			},
			{ threshold: 0.2 }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}

	let obsahVisible = $state(false);
	let recentVisible = $state(false);
</script>

<section
	class="relative overflow-hidden"
	style="background-image: radial-gradient(ellipse 75% 100% at 75% 45%, var(--hero-to) 0%, var(--hero-via) 50%, var(--hero-from) 100%);"
>
	<div class="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_1.3fr] lg:items-center">
		<div class="flex flex-col gap-6 text-hero-foreground">
			<Badge
				variant="outline"
				class="w-fit border-hero-foreground/30 tracking-wide text-hero-foreground/90 uppercase {playIntro
					? 'animate-in duration-700 fade-in slide-in-from-top-4'
					: ''}"
			>
				Vzdělávací platforma
			</Badge>
			<h1
				class="text-4xl font-bold tracking-tight text-balance sm:text-5xl {playIntro
					? 'animate-in delay-100 duration-700 fade-in slide-in-from-top-4'
					: ''}"
			>
				Online konference Nemocnice Beroun
			</h1>
			<p
				class="max-w-md text-hero-foreground/80 {playIntro
					? 'animate-in delay-200 duration-700 fade-in slide-in-from-top-4'
					: ''}"
			>
				Odborné přednášky pro lékaře a zdravotnický personál. Po uhrazení účastnického poplatku vám
				přidělíme přístup ke konkrétní konferenci.
			</p>
			<div class={playIntro ? 'animate-in delay-300 duration-700 fade-in slide-in-from-top-4' : ''}>
				<Button
					href={resolve('/konference')}
					size="lg"
					class="w-fit bg-background font-bold text-primary transition-colors duration-500 hover:bg-primary hover:text-primary-foreground"
				>
					<Lock data-icon="inline-start" strokeWidth={3.5} />
					Zobrazit konference
				</Button>
			</div>
		</div>
		<div
			class="relative flex items-center justify-center {playIntro
				? 'animate-in delay-150 duration-700 fade-in slide-in-from-top-4'
				: ''}"
		>
			<div
				class="pointer-events-none absolute top-2 -left-6 aspect-square w-2/3 rounded-3xl bg-hero-foreground/10 sm:top-4 sm:-left-8"
				aria-hidden="true"
			></div>
			<img
				src="/images/banner2.png"
				alt="Ukázka přehrávače se živým přenosem a záznamem přednášek na notebooku a telefonu"
				class="relative w-full max-w-5xl drop-shadow-2xl"
			/>
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
			description="Sledujte stream živě, nebo si přednášku pusťte kdykoliv později ze záznamu."
		/>
		<FeatureCard
			icon={Archive}
			title="Přístup navždy"
			description="Jednou zakoupené konference vám zůstávají k dispozici — bez expirace, bez omezení."
		/>
	</div>
</section>

<section use:revealOnScroll={(v) => (obsahVisible = v)} class="mx-auto max-w-6xl px-6 pb-20">
	<div class="grid items-center gap-10 lg:grid-cols-2">
		<div
			class="relative aspect-4/3 overflow-hidden rounded-2xl {!playIntro
				? ''
				: obsahVisible
					? 'animate-in duration-700 fade-in slide-in-from-left-8'
					: 'opacity-0'}"
		>
			<img
				src="/images/prednaska.png"
				alt="Přednáška pro zdravotnický personál v Nemocnici Beroun"
				class="h-full w-full object-cover"
			/>
			<div
				class="absolute inset-0 bg-linear-to-tl from-primary/40 via-primary/10 to-transparent"
			></div>
		</div>
		<div
			class="flex flex-col gap-4 {!playIntro
				? ''
				: obsahVisible
					? 'animate-in delay-150 duration-700 fade-in slide-in-from-left-8'
					: 'opacity-0'}"
		>
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
	<section use:revealOnScroll={(v) => (recentVisible = v)} class="mx-auto max-w-6xl px-6 pb-20">
		<div
			class="mb-6 flex flex-wrap items-end justify-between gap-4 {!playIntro
				? ''
				: recentVisible
					? 'animate-in duration-700 fade-in slide-in-from-top-4'
					: 'opacity-0'}"
		>
			<div>
				<h2 class="text-2xl font-bold">Poslední konference</h2>
			</div>
			<Button href={resolve('/konference')} variant="link" class="gap-1 px-0">
				Všechny konference
				<ArrowRight data-icon="inline-end" />
			</Button>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.conferences as conference, i (conference.id)}
				<div
					class="h-full {!playIntro
						? ''
						: recentVisible
							? 'animate-in duration-700 fill-mode-both fade-in slide-in-from-top-4'
							: 'opacity-0'}"
					style:animation-delay={playIntro && recentVisible ? `${150 + i * 80}ms` : undefined}
				>
					<ConferenceCard {conference} />
				</div>
			{/each}
		</div>
	</section>
{/if}
