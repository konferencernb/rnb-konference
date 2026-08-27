<script lang="ts">
	import Calendar from '@lucide/svelte/icons/calendar';
	import Lock from '@lucide/svelte/icons/lock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import PlayCircle from '@lucide/svelte/icons/play-circle';
	import { resolve } from '$app/paths';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import ConferenceStatusBadge from '$lib/components/conference-status-badge.svelte';
	import { getYoutubeThumbnailUrl } from '$lib/youtube';

	type Status = 'upcoming' | 'live' | 'ended';

	let {
		conference,
		editHref
	}: {
		conference: {
			id: string;
			title: string;
			videoUrl: string | null;
			startsAt: string | Date | null;
			status: Status;
			unlocked: boolean;
		};
		editHref?: string;
	} = $props();

	let thumbnailQuality = $state<'maxresdefault' | 'hqdefault'>('maxresdefault');
	let thumbnailFailed = $state(false);
	const thumbnailUrl = $derived(getYoutubeThumbnailUrl(conference.videoUrl, thumbnailQuality));

	function onThumbnailLoad(event: Event) {
		// YouTube serves a 120x90 placeholder (not a real error) when maxresdefault doesn't exist
		const img = event.currentTarget as HTMLImageElement;
		if (thumbnailQuality === 'maxresdefault' && img.naturalWidth <= 120) {
			thumbnailQuality = 'hqdefault';
		}
	}

	function onThumbnailError() {
		if (thumbnailQuality === 'maxresdefault') {
			thumbnailQuality = 'hqdefault';
		} else {
			thumbnailFailed = true;
		}
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- editHref is already resolve()d by the caller -->
<a
	href={editHref ?? resolve('/(public)/konference/[id]', { id: conference.id })}
	class="block rounded-xl transition-shadow hover:shadow-md"
>
	<Card class="h-full gap-0 overflow-hidden py-0">
		<div
			class="relative aspect-video w-full bg-linear-to-br from-accent-soft via-background to-accent-soft-2"
		>
			{#if thumbnailUrl && !thumbnailFailed}
				<img
					src={thumbnailUrl}
					alt=""
					class="h-full w-full object-cover"
					onload={onThumbnailLoad}
					onerror={onThumbnailError}
				/>
			{/if}
			{#if !editHref && !conference.unlocked}
				<span
					class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur"
				>
					<Lock class="size-4" />
				</span>
			{/if}
		</div>
		<CardContent class="flex flex-1 flex-col gap-3 pt-4 pb-4">
			<div class="flex items-center justify-between gap-2">
				<span class="flex items-center gap-1.5 text-sm text-muted-foreground">
					<Calendar class="size-4" />
					{conference.startsAt ? new Date(conference.startsAt).toLocaleDateString('cs-CZ') : '—'}
				</span>
				<ConferenceStatusBadge status={conference.status} />
			</div>
			<h3 class="mt-auto text-lg font-semibold">{conference.title}</h3>
			{#if editHref}
				<span class={[buttonVariants({ variant: 'outline' }), 'mt-1 w-full']}>
					<Pencil data-icon="inline-start" />
					Upravit
				</span>
			{:else if conference.unlocked}
				<span class={[buttonVariants(), 'mt-1 w-full']}>
					<PlayCircle data-icon="inline-start" />
					Otevřít konferenci
				</span>
			{:else}
				<span class={[buttonVariants({ variant: 'outline' }), 'mt-1 w-full']}>
					<Lock data-icon="inline-start" />
					Získat přístup
				</span>
			{/if}
		</CardContent>
	</Card>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
