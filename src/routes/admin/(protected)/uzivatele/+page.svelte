<script lang="ts">
	import { resolve } from '$app/paths';
	import Plus from '@lucide/svelte/icons/plus';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let customers = $state(data.customers);
	let hasMore = $state(data.hasMore);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLDivElement>();
	let searchQuery = $state('');

	const filteredCustomers = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return customers;
		return customers.filter(
			(customer) =>
				customer.email.toLowerCase().includes(query) ||
				customer.displayName.toLowerCase().includes(query)
		);
	});

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;

		const response = await fetch(`/api/admin/uzivatele?offset=${customers.length}`);
		const page = await response.json();

		customers = [...customers, ...page.customers];
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

<div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Uživatelé</h1>
		<div class="flex items-center gap-2">
			<Input
				type="text"
				placeholder="Hledat podle jména nebo emailu…"
				bind:value={searchQuery}
				class="w-80"
			/>
			<Button href={resolve('/admin/uzivatele/new')} size="icon" aria-label="Přidat uživatele">
				<Plus class="size-4" />
			</Button>
		</div>
	</div>

	{#if customers.length === 0}
		<Empty class="border border-dashed bg-card">
			<EmptyDescription>Zatím se nikdo nezaregistroval.</EmptyDescription>
		</Empty>
	{:else if filteredCustomers.length === 0}
		<Empty class="border border-dashed bg-card">
			<EmptyDescription>Nic nenalezeno.</EmptyDescription>
		</Empty>
	{:else}
		<div class="flex flex-col gap-2">
			{#each filteredCustomers as customer (customer.id)}
				<a
					href={resolve('/admin/(protected)/uzivatele/[id]', { id: customer.id })}
					class="block rounded-xl transition-shadow hover:shadow-md"
				>
					<Card>
						<CardContent class="flex items-center justify-between gap-4">
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									{#if customer.status === 'invited'}
										<span
											class="size-2 shrink-0 rounded-full bg-pending"
											aria-label="Nedokončená registrace"
											title="Nedokončená registrace"
										></span>
									{/if}
									<h3 class="truncate font-semibold">{customer.displayName}</h3>
									{#if customer.status === 'invited'}
										<Badge variant="secondary">Pozván</Badge>
									{/if}
								</div>
								<p class="truncate text-sm text-muted-foreground">{customer.email}</p>
							</div>
							<p class="shrink-0 text-sm text-muted-foreground">
								{customer.grantCount}
								{customer.grantCount === 1 ? 'přístup' : 'přístupů'}
							</p>
						</CardContent>
					</Card>
				</a>
			{/each}
		</div>
		{#if hasMore}
			<div bind:this={sentinel} class="flex justify-center py-4">
				{#if loadingMore}
					<Spinner class="size-5 text-muted-foreground" />
				{/if}
			</div>
		{/if}
	{/if}
</div>
