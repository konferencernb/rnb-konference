<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Radio from '@lucide/svelte/icons/radio';
	import Rewind from '@lucide/svelte/icons/rewind';
	import Search from '@lucide/svelte/icons/search';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Users from '@lucide/svelte/icons/users';
	import ViewerTimelineChart from '$lib/components/admin/viewer-timeline-chart.svelte';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input';
	import YoutubePlayer from '$lib/components/youtube-player.svelte';
	import { formatDuration } from '$lib/format-duration';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currentViewersQuery = $state('');
	let allViewersQuery = $state('');

	const filteredCurrentViewers = $derived.by(() => {
		const query = currentViewersQuery.trim().toLowerCase();
		if (!query) return data.currentViewers;
		return data.currentViewers.filter((viewer) => viewer.displayName.toLowerCase().includes(query));
	});

	const filteredAllViewers = $derived.by(() => {
		const query = allViewersQuery.trim().toLowerCase();
		if (!query) return data.allViewers;
		return data.allViewers.filter((viewer) => viewer.displayName.toLowerCase().includes(query));
	});

	let liveViewersQuery = $state('');

	const filteredLiveViewers = $derived.by(() => {
		const query = liveViewersQuery.trim().toLowerCase();
		if (!query) return data.liveViewers;
		return data.liveViewers.filter((viewer) => viewer.displayName.toLowerCase().includes(query));
	});

	let recordedViewersQuery = $state('');

	const filteredRecordedViewers = $derived.by(() => {
		const query = recordedViewersQuery.trim().toLowerCase();
		if (!query) return data.recordedViewers;
		return data.recordedViewers.filter((viewer) =>
			viewer.displayName.toLowerCase().includes(query)
		);
	});

	function formatBreakdown(liveSeconds: number, recordedSeconds: number) {
		if (liveSeconds > 0 && recordedSeconds > 0) {
			return `${formatDuration(liveSeconds)} živě · ${formatDuration(recordedSeconds)} záznam`;
		}
		if (liveSeconds > 0) return `${formatDuration(liveSeconds)} živě`;
		if (recordedSeconds > 0) return `${formatDuration(recordedSeconds)} záznam`;
		return formatDuration(0);
	}

	function statusDotClass(status: 'online' | 'watched' | 'never' | 'invited') {
		if (status === 'online') return 'bg-online';
		if (status === 'watched') return 'bg-muted-foreground';
		if (status === 'invited') return 'bg-pending';
		return 'bg-destructive';
	}

	function statusLabel(status: 'online' | 'watched' | 'never' | 'invited') {
		if (status === 'online') return 'Právě online';
		if (status === 'watched') return 'Sledoval(a), teď není online';
		if (status === 'invited') return 'Zatím nedokončil(a) registraci';
		return 'Zatím nikdy nesledoval(a)';
	}

	// Keeps "aktuálně sledující" (and the lists in the dialogs) in sync with
	// reality without a manual refresh.
	$effect(() => {
		const interval = setInterval(() => invalidateAll(), 15000);
		return () => clearInterval(interval);
	});
</script>

{#if data.conference.videoUrl}
	<YoutubePlayer
		videoUrl={data.conference.videoUrl}
		title={data.conference.title}
		isLive={data.conference.status === 'live'}
	/>
{:else}
	<Card>
		<CardContent class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
			<p>Livestream ještě nezačal.</p>
		</CardContent>
	</Card>
{/if}

<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<Dialog>
		<DialogTrigger>
			{#snippet child({ props })}
				<div
					{...props}
					role="button"
					tabindex="0"
					class="cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md"
				>
					<Card>
						<CardContent class="flex items-center justify-between">
							<div>
								<p class="text-sm text-muted-foreground">Aktuálně sledující</p>
								<p class="mt-1 text-2xl font-bold">{data.currentlyWatching}</p>
							</div>
							<Users class="size-5 text-muted-foreground" />
						</CardContent>
					</Card>
				</div>
			{/snippet}
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Aktuálně sledující</DialogTitle>
			</DialogHeader>
			{#if data.currentViewers.length === 0}
				<Empty class="border border-dashed bg-card">
					<EmptyDescription>Momentálně nikdo nesleduje.</EmptyDescription>
				</Empty>
			{:else}
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Hledat uživatele…"
						autocomplete="off"
						bind:value={currentViewersQuery}
						class="pl-9"
					/>
				</div>
				{#if filteredCurrentViewers.length === 0}
					<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
				{:else}
					<div class="flex max-h-72 flex-col gap-3 overflow-y-auto">
						{#each filteredCurrentViewers as viewer (viewer.userId)}
							<div class="flex items-center gap-3">
								<span class="size-2 shrink-0 rounded-full bg-online" aria-label="Právě online"
								></span>
								<Avatar size="sm">
									<AvatarFallback>
										<UserRound class="size-4" />
									</AvatarFallback>
								</Avatar>
								<span class="min-w-0 flex-1 truncate font-medium">
									{viewer.displayName}
								</span>
								<span class="shrink-0 text-sm text-muted-foreground">
									{formatBreakdown(viewer.liveWatchSeconds, viewer.recordedWatchSeconds)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</DialogContent>
	</Dialog>

	<Dialog>
		<DialogTrigger>
			{#snippet child({ props })}
				<div
					{...props}
					role="button"
					tabindex="0"
					class="cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md"
				>
					<Card>
						<CardContent class="flex items-center justify-between">
							<div>
								<p class="text-sm text-muted-foreground">Celkem sledujících</p>
								<p class="mt-1 text-2xl font-bold">
									{data.totalViewers}<span class="text-lg text-muted-foreground"
										>/{data.expectedViewers}</span
									>
								</p>
							</div>
							<Users class="size-5 text-muted-foreground" />
						</CardContent>
					</Card>
				</div>
			{/snippet}
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Celkem sledujících</DialogTitle>
			</DialogHeader>
			{#if data.allViewers.length === 0}
				<Empty class="border border-dashed bg-card">
					<EmptyDescription>Zatím nikdo nemá přístup k této konferenci.</EmptyDescription>
				</Empty>
			{:else}
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Hledat uživatele…"
						autocomplete="off"
						bind:value={allViewersQuery}
						class="pl-9"
					/>
				</div>
				{#if filteredAllViewers.length === 0}
					<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
				{:else}
					<div class="flex max-h-72 flex-col gap-3 overflow-y-auto">
						{#each filteredAllViewers as viewer (viewer.userId)}
							<div class="flex items-center gap-3">
								<span
									class="size-2 shrink-0 rounded-full {statusDotClass(viewer.status)}"
									aria-label={statusLabel(viewer.status)}
									title={statusLabel(viewer.status)}
								></span>
								<Avatar size="sm">
									<AvatarFallback>
										<UserRound class="size-4" />
									</AvatarFallback>
								</Avatar>
								<span class="min-w-0 flex-1 truncate font-medium">
									{viewer.displayName}
								</span>
								<span class="shrink-0 text-sm text-muted-foreground">
									{viewer.status === 'never' ? '—' : formatDuration(viewer.watchSeconds)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</DialogContent>
	</Dialog>

	<Dialog>
		<DialogTrigger>
			{#snippet child({ props })}
				<div
					{...props}
					role="button"
					tabindex="0"
					class="cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md"
				>
					<Card>
						<CardContent class="flex items-center justify-between">
							<div>
								<p class="text-sm text-muted-foreground">Sledovalo živě</p>
								<p class="mt-1 text-2xl font-bold">{data.watchedLiveCount}</p>
							</div>
							<Radio class="size-5 text-muted-foreground" />
						</CardContent>
					</Card>
				</div>
			{/snippet}
		</DialogTrigger>
		<DialogContent class="sm:max-w-xl">
			<DialogHeader>
				<DialogTitle>Sledovalo živě</DialogTitle>
			</DialogHeader>
			<ViewerTimelineChart data={data.liveViewerTimeline} />
			{#if data.liveViewers.length === 0}
				<Empty class="border border-dashed bg-card">
					<EmptyDescription>Zatím nikdo nesledoval živě.</EmptyDescription>
				</Empty>
			{:else}
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Hledat uživatele…"
						autocomplete="off"
						bind:value={liveViewersQuery}
						class="pl-9"
					/>
				</div>
				{#if filteredLiveViewers.length === 0}
					<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
				{:else}
					<div class="flex max-h-72 flex-col gap-3 overflow-y-auto">
						{#each filteredLiveViewers as viewer (viewer.userId)}
							<div class="flex items-center gap-3">
								<Avatar size="sm">
									<AvatarFallback>
										<UserRound class="size-4" />
									</AvatarFallback>
								</Avatar>
								<span class="min-w-0 flex-1 truncate font-medium">
									{viewer.displayName}
								</span>
								<span class="shrink-0 text-sm text-muted-foreground">
									{formatDuration(viewer.liveWatchSeconds)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</DialogContent>
	</Dialog>

	<Dialog>
		<DialogTrigger>
			{#snippet child({ props })}
				<div
					{...props}
					role="button"
					tabindex="0"
					class="cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md"
				>
					<Card>
						<CardContent class="flex items-center justify-between">
							<div>
								<p class="text-sm text-muted-foreground">Sledovalo ze záznamu</p>
								<p class="mt-1 text-2xl font-bold">{data.watchedRecordedCount}</p>
							</div>
							<Rewind class="size-5 text-muted-foreground" />
						</CardContent>
					</Card>
				</div>
			{/snippet}
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Sledovalo ze záznamu</DialogTitle>
			</DialogHeader>
			{#if data.recordedViewers.length === 0}
				<Empty class="border border-dashed bg-card">
					<EmptyDescription>Zatím nikdo nesledoval ze záznamu.</EmptyDescription>
				</Empty>
			{:else}
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Hledat uživatele…"
						autocomplete="off"
						bind:value={recordedViewersQuery}
						class="pl-9"
					/>
				</div>
				{#if filteredRecordedViewers.length === 0}
					<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
				{:else}
					<div class="flex max-h-72 flex-col gap-3 overflow-y-auto">
						{#each filteredRecordedViewers as viewer (viewer.userId)}
							<div class="flex items-center gap-3">
								<Avatar size="sm">
									<AvatarFallback>
										<UserRound class="size-4" />
									</AvatarFallback>
								</Avatar>
								<span class="min-w-0 flex-1 truncate font-medium">
									{viewer.displayName}
								</span>
								<span class="shrink-0 text-sm text-muted-foreground">
									{formatDuration(viewer.recordedWatchSeconds)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</DialogContent>
	</Dialog>
</div>
