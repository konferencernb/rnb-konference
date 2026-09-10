<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Spinner } from '$lib/components/ui/spinner';
	import { formatPragueDateTime } from '$lib/prague-time';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let entries = $state(data.entries);
	let hasMore = $state(data.hasMore);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLDivElement>();

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;

		const response = await fetch(`/api/admin/logy?offset=${entries.length}`);
		const page = await response.json();

		entries = [...entries, ...page.entries];
		hasMore = page.hasMore;
		loadingMore = false;
	}

	$effect(() => {
		if (!sentinel || !hasMore) return;

		const observer = new IntersectionObserver(
			(observed) => {
				if (observed[0].isIntersecting) loadMore();
			},
			{ rootMargin: '400px' }
		);
		observer.observe(sentinel);

		return () => observer.disconnect();
	});
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Logy přístupů</h1>
	</div>

	{#if entries.length === 0}
		<Empty class="border border-dashed bg-card">
			<EmptyDescription>Zatím nejsou žádné záznamy o přístupech.</EmptyDescription>
		</Empty>
	{:else}
		<Card class="overflow-hidden py-0">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Čas</TableHead>
						<TableHead>Konference</TableHead>
						<TableHead>Uživatel</TableHead>
						<TableHead>IP adresa</TableHead>
						<TableHead>Zařízení</TableHead>
						<TableHead>Výsledek</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each entries as entry (entry.id)}
						<TableRow>
							<TableCell class="max-w-28">
								{formatPragueDateTime(entry.createdAt)}
							</TableCell>
							<TableCell>{entry.conferenceTitle}</TableCell>
							<TableCell>{entry.userEmail ?? 'Anonym'}</TableCell>
							<TableCell>{entry.ipAddress ?? '—'}</TableCell>
							<TableCell
								class="max-w-48 truncate text-muted-foreground"
								title={entry.userAgent ?? ''}
							>
								{entry.userAgent ?? '—'}
							</TableCell>
							<TableCell>
								<Badge variant={entry.result === 'granted' ? 'secondary' : 'destructive'}>
									{entry.result === 'granted' ? 'Povoleno' : 'Zamítnuto'}
								</Badge>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
		{#if hasMore}
			<div bind:this={sentinel} class="flex justify-center py-4">
				{#if loadingMore}
					<Spinner class="size-5 text-muted-foreground" />
				{/if}
			</div>
		{/if}
	{/if}
</div>
