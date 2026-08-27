<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle,
		AlertDialogTrigger
	} from '$lib/components/ui/alert-dialog';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let grantSubmitting = $state(false);
	let comboboxOpen = $state(false);
	let searchQuery = $state('');
	let selectedUserId = $state<string | undefined>(undefined);
	let grantFormEl = $state<HTMLFormElement>();

	// PopoverTrigger's props include onclick/onkeydown meant for a button trigger
	// (space/enter toggle the popover) — strip them so the field behaves like a
	// normal text input instead.
	function omitTriggerHandlers(props: Record<string, unknown>) {
		const rest = { ...props };
		delete rest.onclick;
		delete rest.onkeydown;
		return rest;
	}

	const filteredCustomers = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return data.availableCustomers;
		return data.availableCustomers.filter(
			(customer) =>
				customer.email.toLowerCase().includes(query) ||
				customer.displayName.toLowerCase().includes(query)
		);
	});

	async function selectCustomer(userId: string) {
		selectedUserId = userId;
		comboboxOpen = false;
		searchQuery = '';
		grantSubmitting = true;
		await tick();
		grantFormEl?.requestSubmit();
	}
</script>

<section>
	<h2 class="mb-4 text-lg font-semibold">Přidělit přístup</h2>
	<Card>
		<CardContent>
			{#if data.availableCustomers.length === 0}
				<p class="text-sm text-muted-foreground">
					Všichni registrovaní zákazníci už mají k této konferenci přístup.
				</p>
			{:else}
				<form
					bind:this={grantFormEl}
					method="POST"
					action="?/grantAccess"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							grantSubmitting = false;
							selectedUserId = undefined;
						};
					}}
				>
					<div class="flex flex-col gap-1.5">
						<Label for="customer-search">Zákazník</Label>
						<Popover bind:open={comboboxOpen}>
							<PopoverTrigger>
								{#snippet child({ props })}
									<div class="relative">
										<Search
											class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
										/>
										<Input
											{...omitTriggerHandlers(props)}
											id="customer-search"
											type="text"
											placeholder="Hledat podle jména nebo emailu…"
											autocomplete="off"
											disabled={grantSubmitting}
											bind:value={searchQuery}
											onclick={() => (comboboxOpen = true)}
											oninput={() => (comboboxOpen = true)}
											class="cursor-pointer pl-9"
										/>
									</div>
								{/snippet}
							</PopoverTrigger>
							<PopoverContent
								class="w-(--bits-floating-anchor-width) p-1"
								onOpenAutoFocus={(event) => event.preventDefault()}
								onCloseAutoFocus={(event) => event.preventDefault()}
							>
								{#if filteredCustomers.length === 0}
									<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
								{:else}
									<div class="max-h-72 overflow-y-auto">
										{#each filteredCustomers as customer (customer.id)}
											<button
												type="button"
												class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
												onclick={() => selectCustomer(customer.id)}
											>
												<CirclePlus class="size-4 shrink-0 text-primary" />
												<span class="min-w-0 flex-1 truncate">{customer.displayName}</span>
												{#if customer.displayName !== customer.email}
													<span
														class="ml-auto shrink-0 text-xs whitespace-nowrap text-muted-foreground"
													>
														{customer.email}
													</span>
												{/if}
											</button>
										{/each}
									</div>
								{/if}
							</PopoverContent>
						</Popover>
					</div>
					<input type="hidden" name="userId" value={selectedUserId ?? ''} />
				</form>
			{/if}
			{#if form?.grantError}
				<p class="mt-2 text-sm text-destructive">{form.grantError}</p>
			{/if}
		</CardContent>
	</Card>
</section>

<section class="mt-8">
	<h2 class="mb-4 text-lg font-semibold">Přístupy</h2>
	{#if data.grants.length === 0}
		<Empty class="border border-dashed bg-card">
			<EmptyDescription>Zatím nikdo nemá přidělený přístup k této konferenci.</EmptyDescription>
		</Empty>
	{:else}
		<div class="flex flex-col gap-2">
			{#each data.grants as grant (grant.id)}
				<Card>
					<CardContent class="flex items-center justify-between gap-4">
						<div>
							<div class="flex items-center gap-2">
								{#if grant.userStatus === 'invited'}
									<span
										class="size-2 shrink-0 rounded-full bg-pending"
										aria-label="Nedokončená registrace"
										title="Nedokončená registrace"
									></span>
								{/if}
								<h3 class="font-semibold">{grant.userDisplayName}</h3>
							</div>
							<p class="text-sm text-muted-foreground">
								Přiděleno: {new Date(grant.grantedAt).toLocaleDateString('cs-CZ')}
							</p>
						</div>
						<AlertDialog>
							<AlertDialogTrigger>
								{#snippet child({ props })}
									<Button {...props} variant="destructive" size="sm">
										<Trash2 data-icon="inline-start" />
										Odebrat
									</Button>
								{/snippet}
							</AlertDialogTrigger>
							<AlertDialogContent interactOutsideBehavior="close">
								<AlertDialogHeader>
									<AlertDialogTitle>Odebrat přístup</AlertDialogTitle>
									<AlertDialogDescription>
										Opravdu chcete odebrat přístup z {grant.userDisplayName}?
									</AlertDialogDescription>
								</AlertDialogHeader>
								<form method="POST" action="?/revokeAccess" use:enhance>
									<input type="hidden" name="grantId" value={grant.id} />
									<AlertDialogFooter>
										<AlertDialogCancel type="button" variant="ghost">Zrušit</AlertDialogCancel>
										<AlertDialogAction type="submit" variant="destructive">Ano</AlertDialogAction>
									</AlertDialogFooter>
								</form>
							</AlertDialogContent>
						</AlertDialog>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</section>
