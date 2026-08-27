<script lang="ts">
	import { resolve } from '$app/paths';
	import Calendar from '@lucide/svelte/icons/calendar';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Plus from '@lucide/svelte/icons/plus';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Users from '@lucide/svelte/icons/users';
	import Wallet from '@lucide/svelte/icons/wallet';
	import StatCard from '$lib/components/admin/stat-card.svelte';
	import ViewerTimelineChart from '$lib/components/admin/viewer-timeline-chart.svelte';
	import WatchSummaryChart from '$lib/components/admin/watch-summary-chart.svelte';
	import ConferenceStatusBadge from '$lib/components/conference-status-badge.svelte';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Dashboard</h1>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<StatCard
			icon={Wallet}
			label="Tržby celkem"
			value="{data.revenue.toLocaleString('cs-CZ')} Kč"
		/>
		<StatCard icon={Calendar} label="Konferencí celkem" value={data.conferenceCount} />
		<StatCard icon={Users} label="Úspěšných přístupů" value={data.stats.granted} />
		<StatCard icon={EyeOff} label="Neúspěšných pokusů" value={data.stats.denied} />
	</div>

	<div class="grid gap-4 lg:grid-cols-3">
		<Card class="lg:col-span-2">
			<CardContent>
				<h2 class="mb-4 text-lg font-semibold">Sledovanost tento měsíc</h2>
				<ViewerTimelineChart
					data={data.monthlyViewership}
					granularity="day"
					ariaLabel="Počet diváků podle dne v aktuálním měsíci"
				/>
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="mb-4 flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Uživatelé</h2>
					<Button
						href={resolve('/admin/uzivatele/new')}
						size="icon-sm"
						variant="outline"
						aria-label="Přidat uživatele"
					>
						<Plus class="size-4" />
					</Button>
				</div>
				{#if data.usersByWatchTime.length === 0}
					<Empty class="border border-dashed bg-card">
						<EmptyDescription>Zatím nejsou žádní uživatelé.</EmptyDescription>
					</Empty>
				{:else}
					<div class="flex flex-col gap-1">
						{#each data.usersByWatchTime as viewer (viewer.userId)}
							<a
								href={resolve('/admin/(protected)/uzivatele/[id]', { id: viewer.userId })}
								class="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
							>
								<Avatar size="sm">
									<AvatarFallback>
										<UserRound class="size-4" />
									</AvatarFallback>
								</Avatar>
								<span class="min-w-0 flex-1 truncate font-medium">{viewer.displayName}</span>
							</a>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	<div class="grid gap-4 lg:grid-cols-3">
		<Card class="lg:col-span-2">
			<CardContent>
				<h2 class="mb-4 text-lg font-semibold">Sledovanost konferencí</h2>
				<WatchSummaryChart data={data.watchSummary} />
			</CardContent>
		</Card>

		<Card>
			<CardContent>
				<div class="mb-4 flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Konference</h2>
					<a href={resolve('/admin/konference')} class="text-sm text-primary hover:underline">
						Zobrazit všechny
					</a>
				</div>
				{#if data.orderedConferences.length === 0}
					<Empty class="border border-dashed bg-card">
						<EmptyDescription>Momentálně nejsou žádné konference.</EmptyDescription>
					</Empty>
				{:else}
					<div class="flex flex-col gap-2">
						{#each data.orderedConferences as conf, i (conf.id)}
							{#if i === data.liveCountVisible && data.liveCountVisible > 0}
								<Separator />
							{/if}
							<a
								href={resolve('/admin/(protected)/konference/[id]/sledovat', { id: conf.id })}
								class="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
							>
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{conf.title}</p>
										{#if conf.startsAt}
											<p class="text-xs text-muted-foreground">
												{new Date(conf.startsAt).toLocaleString('cs-CZ')}
											</p>
										{/if}
									</div>
									<ConferenceStatusBadge status={conf.status} />
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
