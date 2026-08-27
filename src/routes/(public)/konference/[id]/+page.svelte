<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import VideoOff from '@lucide/svelte/icons/video-off';
	import YoutubePlayer from '$lib/components/youtube-player.svelte';
	import ConferenceStatusBadge from '$lib/components/conference-status-badge.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Plain primitives, memoized via $derived: invalidateAll() (from either
	// effect below) replaces `data` with a new object every ~15s, but as long
	// as these actual values haven't changed, $derived won't propagate that as
	// a change — so the effects that gate on them don't tear down and restart
	// (and double up their intervals) on every unrelated refresh.
	const isUpcoming = $derived(data.unlocked && data.conference.status === 'upcoming');
	const watchableVideoUrl = $derived(
		data.unlocked && 'videoUrl' in data.conference ? (data.conference.videoUrl ?? null) : null
	);
	const conferenceId = $derived(data.conference.id);

	// While the stream isn't up yet, poll for updates so a customer who already
	// has the page open sees it switch to live automatically, without having to
	// refresh manually once the admin adds the video and flips the status.
	$effect(() => {
		if (!isUpcoming) return;

		const interval = setInterval(() => {
			invalidateAll();
		}, 15000);

		return () => clearInterval(interval);
	});

	// Tell the server we're actually watching, roughly every 15s (kept in sync
	// with HEARTBEAT_INTERVAL_SECONDS in $lib/server/watch-tracking.ts). This is
	// what powers "aktuálně sledující" (presence, from the most recent beat)
	// and "celkem sledujících" (one row per viewer, so leaving and coming back
	// mid-stream doesn't count twice) on the admin "Sledovat" tab. Paused while
	// the tab isn't visible so a forgotten background tab doesn't count as
	// someone actively watching.
	$effect(() => {
		if (!watchableVideoUrl) return;

		const id = conferenceId;

		function sendHeartbeat() {
			if (document.hidden) return;
			fetch(`/api/konference/${id}/heartbeat`, { method: 'POST' }).catch(() => {});
		}

		function onVisibilityChange() {
			if (!document.hidden) sendHeartbeat();
		}

		sendHeartbeat();
		const interval = setInterval(sendHeartbeat, 15000);
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{data.conference.title}</h1>
		<ConferenceStatusBadge status={data.conference.status} />
	</div>

	{#if data.unlocked && 'videoUrl' in data.conference && data.conference.videoUrl}
		<YoutubePlayer
			videoUrl={data.conference.videoUrl}
			title={data.conference.title}
			isLive={data.conference.status === 'live'}
		/>
		{#if data.conference.description}
			<div class="rich-text mt-6 text-muted-foreground">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side in sanitizeDescription before it's ever stored -->
				{@html data.conference.description}
			</div>
		{/if}
	{:else if data.unlocked}
		<Card>
			<CardContent class="flex flex-col items-center gap-4 py-12 text-center">
				<span
					class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
				>
					<VideoOff class="size-6" />
				</span>
				<div>
					<p class="font-semibold">Livestream ještě nezačal</p>
					<p class="mt-1 text-muted-foreground">
						Jakmile bude přenos připravený, stránka se automaticky obnoví.
					</p>
				</div>
			</CardContent>
		</Card>
		{#if data.conference.description}
			<div class="rich-text mt-6 text-muted-foreground">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side in sanitizeDescription before it's ever stored -->
				{@html data.conference.description}
			</div>
		{/if}
	{:else}
		<Card>
			<CardContent class="flex flex-col items-center gap-4 py-12 text-center">
				<span
					class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
				>
					<Lock class="size-6" />
				</span>
				<div>
					<p class="font-semibold">K této konferenci zatím nemáte přístup</p>
					<p class="mt-1 text-muted-foreground">
						Cena: {data.conference.price} Kč. Po zaplacení vám přidělíme trvalý přístup, včetně záznamu.
					</p>
				</div>
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<Mail class="size-4" />
					Napište nám na
					<a href="mailto:community@nember.cz" class="text-foreground underline"
						>community@nember.cz</a
					>
				</p>
			</CardContent>
		</Card>
	{/if}
</div>
