<script lang="ts">
	import { resolve } from '$app/paths';
	import Calendar from '@lucide/svelte/icons/calendar';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Users from '@lucide/svelte/icons/users';
	import StatCard from '$lib/components/admin/stat-card.svelte';
	import ConferenceStatusBadge from '$lib/components/conference-status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Dashboard</h1>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<StatCard icon={Calendar} label="Konferencí celkem" value={data.conferenceCount} />
		<StatCard icon={Users} label="Úspěšných přístupů" value={data.stats.granted} />
		<StatCard icon={EyeOff} label="Neúspěšných pokusů" value={data.stats.denied} />
	</div>

	<section>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Nadcházející a živé konference</h2>
			<a href={resolve('/admin/konference')} class="text-sm text-primary hover:underline">
				Zobrazit všechny
			</a>
		</div>
		{#if data.upcomingConferences.length === 0}
			<Empty class="border border-dashed bg-card">
				<EmptyDescription>Momentálně nejsou naplánované žádné konference.</EmptyDescription>
			</Empty>
		{:else}
			<div class="flex flex-col gap-2">
				{#each data.upcomingConferences as conf (conf.id)}
					<a
						href={resolve('/admin/(protected)/konference/[id]', { id: conf.id })}
						class="block rounded-xl transition-shadow hover:shadow-md"
					>
						<Card>
							<CardContent class="flex items-center justify-between gap-4">
								<div class="min-w-0">
									<h3 class="truncate font-semibold">{conf.title}</h3>
									{#if conf.startsAt}
										<p class="text-sm text-muted-foreground">
											{new Date(conf.startsAt).toLocaleString('cs-CZ')}
										</p>
									{/if}
								</div>
								<ConferenceStatusBadge status={conf.status} />
							</CardContent>
						</Card>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<section>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Poslední přístupy</h2>
			<a href={resolve('/admin/logy')} class="text-sm text-primary hover:underline">
				Zobrazit všechny
			</a>
		</div>
		{#if data.recentAccess.length === 0}
			<Empty class="border border-dashed bg-card">
				<EmptyDescription>Zatím nejsou žádné záznamy o přístupech.</EmptyDescription>
			</Empty>
		{:else}
			<div class="flex flex-col gap-2">
				{#each data.recentAccess as entry (entry.id)}
					<Card>
						<CardContent class="flex items-center justify-between gap-4">
							<div class="min-w-0">
								<p class="text-xs text-muted-foreground">
									{new Date(entry.createdAt).toLocaleString('cs-CZ')}
								</p>
								<h3 class="truncate font-semibold">{entry.conferenceTitle}</h3>
								<p class="truncate text-sm text-muted-foreground">
									{entry.userEmail ?? 'Anonym'}
								</p>
							</div>
							<Badge variant={entry.result === 'granted' ? 'secondary' : 'destructive'}>
								{entry.result === 'granted' ? 'Povoleno' : 'Zamítnuto'}
							</Badge>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
