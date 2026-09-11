<script lang="ts">
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';
	import Clock from '@lucide/svelte/icons/clock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { formatCustomerName } from '$lib/format-name';
	import { formatPragueDate } from '$lib/prague-time';
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
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Dialog,
		DialogContent,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { formatDuration } from '$lib/format-duration';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let grantSubmitting = $state(false);
	let comboboxOpen = $state(false);
	let searchQuery = $state('');
	let selectedConferenceId = $state<string | undefined>(undefined);
	let grantFormEl = $state<HTMLFormElement>();
	let deleteDialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let editSubmitting = $state(false);
	let resetSubmitting = $state(false);
	let editFirstName = $state(data.customer.firstName ?? '');
	let editLastName = $state(data.customer.lastName ?? '');
	let editEmail = $state(data.customer.email);

	function formatConferenceDate(startsAt: string | Date | null) {
		return startsAt ? formatPragueDate(startsAt) : '';
	}

	// PopoverTrigger's props include onclick/onkeydown meant for a button trigger
	// (space/enter toggle the popover) — strip them so the field behaves like a
	// normal text input instead.
	function omitTriggerHandlers(props: Record<string, unknown>) {
		const rest = { ...props };
		delete rest.onclick;
		delete rest.onkeydown;
		return rest;
	}

	const filteredConferences = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return data.availableConferences;
		return data.availableConferences.filter(
			(conference) =>
				conference.title.toLowerCase().includes(query) ||
				formatConferenceDate(conference.startsAt).includes(query)
		);
	});

	async function selectConference(conferenceId: string) {
		selectedConferenceId = conferenceId;
		comboboxOpen = false;
		searchQuery = '';
		grantSubmitting = true;
		await tick();
		grantFormEl?.requestSubmit();
	}

	// Re-seed the fields off the current (saved) values every time the modal
	// opens, so a cancelled edit never lingers into the next time it's opened.
	$effect(() => {
		if (!editDialogOpen) return;
		editFirstName = data.customer.firstName ?? '';
		editLastName = data.customer.lastName ?? '';
		editEmail = data.customer.email;
	});
</script>

<div class="mx-auto max-w-6xl px-6 py-10">
	<div class="flex items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				{#if data.customer.status === 'invited'}
					<span
						class="size-2 shrink-0 rounded-full bg-pending"
						aria-label="Nedokončená registrace"
						title="Nedokončená registrace"
					></span>
				{/if}
				<h1 class="text-2xl font-bold">{formatCustomerName(data.customer)}</h1>
				{#if data.customer.status === 'invited'}
					<Badge variant="secondary">Pozván</Badge>
				{/if}
			</div>
			<p class="text-muted-foreground">{data.customer.email}</p>
			{#if data.customer.status === 'invited'}
				<p class="mt-1 text-sm text-muted-foreground">
					Pozvánka odeslána {formatPragueDate(data.customer.createdAt)}, čeká na dokončení
					registrace.
				</p>
			{:else}
				<p class="mt-1 text-sm text-muted-foreground">
					Registrace: {formatPragueDate(data.customer.registeredAt ?? data.customer.createdAt)}
				</p>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<AlertDialog bind:open={deleteDialogOpen}>
				<AlertDialogTrigger>
					{#snippet child({ props })}
						<Button {...props} variant="destructive" size="icon" aria-label="Smazat uživatele">
							<Trash2 class="size-4" />
						</Button>
					{/snippet}
				</AlertDialogTrigger>
				<AlertDialogContent interactOutsideBehavior="close">
					<AlertDialogHeader>
						<AlertDialogTitle>Smazat uživatele</AlertDialogTitle>
						<AlertDialogDescription>
							Opravdu chcete smazat uživatele {formatCustomerName(data.customer)}? Nenávratně se
							smažou i všechny jeho přístupy a historie sledování.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<form
						method="POST"
						action="?/deleteUser"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'redirect') {
									deleteDialogOpen = false;
									toast.success('Uživatel byl úspěšně smazán.');
									// eslint-disable-next-line svelte/no-navigation-without-resolve -- result.location is already a server-resolved path, not a route id
									await goto(result.location, { invalidateAll: true });
									return;
								}

								await applyAction(result);
								if (result.type === 'error') {
									toast.error('Uživatele se nepodařilo smazat.');
								}
							};
						}}
					>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" variant="ghost">Zrušit</AlertDialogCancel>
							<AlertDialogAction type="submit" variant="destructive">Ano</AlertDialogAction>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
			<Dialog bind:open={editDialogOpen}>
				<DialogTrigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline">
							<Pencil data-icon="inline-start" />
							Upravit
						</Button>
					{/snippet}
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Upravit uživatele</DialogTitle>
					</DialogHeader>
					<form
						method="POST"
						action="?/updateUser"
						class="flex flex-col gap-4"
						use:enhance={() => {
							editSubmitting = true;
							return async ({ result, update }) => {
								editSubmitting = false;
								if (result.type === 'success') {
									editDialogOpen = false;
									toast.success('Uživatel byl úspěšně uložen.');
									await update();
									return;
								}

								await applyAction(result);
								if (result.type === 'error') {
									toast.error('Něco se pokazilo. Zkuste to prosím znovu.');
								}
							};
						}}
					>
						<div class="flex gap-3">
							<div class="flex flex-1 flex-col gap-1.5">
								<Label for="edit-firstName">Jméno</Label>
								<Input id="edit-firstName" name="firstName" bind:value={editFirstName} required />
							</div>
							<div class="flex flex-1 flex-col gap-1.5">
								<Label for="edit-lastName">Příjmení</Label>
								<Input id="edit-lastName" name="lastName" bind:value={editLastName} required />
							</div>
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="edit-email">Email</Label>
							<Input id="edit-email" name="email" type="email" bind:value={editEmail} required />
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="edit-password">Heslo</Label>
							<Input id="edit-password" type="password" placeholder="•••••" disabled />
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="self-start"
								disabled={resetSubmitting}
								onclick={async () => {
									resetSubmitting = true;
									// Same endpoint the public "zapomenuté heslo" page calls —
									// no separate admin-side reset mechanism to keep in sync.
									const response = await fetch('/api/zapomenute-heslo', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({ email: data.customer.email })
									});
									resetSubmitting = false;
									if (response.ok) {
										toast.success('Odkaz na reset hesla byl odeslán uživateli e-mailem.');
									} else {
										toast.error('Reset hesla se nepodařilo odeslat.');
									}
								}}
							>
								{resetSubmitting ? 'Odesílání…' : 'Reset hesla'}
							</Button>
						</div>
						{#if form?.updateError}
							<p class="text-sm text-destructive">{form.updateError}</p>
						{/if}
						<DialogFooter>
							<Button type="button" variant="ghost" onclick={() => (editDialogOpen = false)}>
								Zrušit
							</Button>
							<Button type="submit" disabled={editSubmitting}>
								{editSubmitting ? 'Ukládání…' : 'Uložit'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	</div>

	<section class="mt-8">
		<h2 class="mb-4 text-lg font-semibold">Přidělit přístup</h2>
		<Card>
			<CardContent>
				{#if data.availableConferences.length === 0}
					<p class="text-sm text-muted-foreground">
						Uživatel má přístup ke všem existujícím konferencím.
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
								selectedConferenceId = undefined;
							};
						}}
					>
						<div class="flex flex-col gap-1.5">
							<Label for="conference-search">Konference</Label>
							<Popover bind:open={comboboxOpen}>
								<PopoverTrigger>
									{#snippet child({ props })}
										<div class="relative">
											<Search
												class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
											/>
											<Input
												{...omitTriggerHandlers(props)}
												id="conference-search"
												type="text"
												placeholder="Hledat podle názvu nebo data…"
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
									{#if filteredConferences.length === 0}
										<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
									{:else}
										<div class="max-h-72 overflow-y-auto">
											{#each filteredConferences as conference (conference.id)}
												<button
													type="button"
													class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
													onclick={() => selectConference(conference.id)}
												>
													<CirclePlus class="size-4 shrink-0 text-primary" />
													<span class="min-w-0 flex-1 truncate">{conference.title}</span>
													{#if conference.startsAt}
														<span
															class="ml-auto shrink-0 text-xs whitespace-nowrap text-muted-foreground"
														>
															{formatConferenceDate(conference.startsAt)}
														</span>
													{/if}
												</button>
											{/each}
										</div>
									{/if}
								</PopoverContent>
							</Popover>
						</div>
						<input type="hidden" name="conferenceId" value={selectedConferenceId ?? ''} />
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
				<EmptyDescription>Zatím nemá přístup k žádné konferenci.</EmptyDescription>
			</Empty>
		{:else}
			<div class="flex flex-col gap-2">
				{#each data.grants as grant (grant.id)}
					<Card>
						<CardContent class="flex items-center justify-between gap-4">
							<div>
								<h3 class="font-semibold">{grant.conferenceTitle}</h3>
								<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
									<Clock class="size-3.5" />
									{formatDuration(
										(grant.liveWatchSeconds ?? 0) + (grant.recordedWatchSeconds ?? 0)
									)}
									<span aria-hidden="true">|</span>
									<CalendarPlus class="size-3.5" />
									Přiděleno: {formatPragueDate(grant.grantedAt)}
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
											Opravdu chcete odebrat přístup z {grant.conferenceTitle}?
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
</div>
