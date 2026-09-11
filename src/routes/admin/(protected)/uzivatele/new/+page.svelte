<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';
	import Download from '@lucide/svelte/icons/download';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle
	} from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Dialog,
		DialogContent,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import type { ActionData, PageData } from './$types';

	type ImportRow = { firstName: string; lastName: string; email: string; conferenceName: string };

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
	let activeTab = $state('rucne');

	// PopoverTrigger's props include onclick/onkeydown meant for a button trigger
	// (space/enter toggle the popover) — strip them so the field behaves like a
	// normal text input instead.
	function omitTriggerHandlers(props: Record<string, unknown>) {
		const rest = { ...props };
		delete rest.onclick;
		delete rest.onkeydown;
		return rest;
	}

	// --- Ručně: optional conferences to grant right away, same search-and-add
	// pattern as "Přidělit přístup" elsewhere — add one at a time, each shown
	// stacked below so several can be attached to the one new user. ---
	let confComboboxOpen = $state(false);
	let confSearchQuery = $state('');
	let selectedConferenceTitles = $state<string[]>([]);

	const availableConferencesForManual = $derived.by(() => {
		const query = confSearchQuery.trim().toLowerCase();
		return data.conferences
			.filter((c) => !selectedConferenceTitles.includes(c.title))
			.filter((c) => !query || c.title.toLowerCase().includes(query));
	});

	function addManualConference(title: string) {
		selectedConferenceTitles = [...selectedConferenceTitles, title];
		confComboboxOpen = false;
		confSearchQuery = '';
	}

	function removeManualConference(title: string) {
		selectedConferenceTitles = selectedConferenceTitles.filter((t) => t !== title);
	}

	// --- Import z Excelu ---
	let fileInputEl = $state<HTMLInputElement>();
	let parsingFile = $state(false);
	let importError = $state<string | null>(null);
	let importedRows = $state<ImportRow[]>([]);
	let importSubmitting = $state(false);

	// One card per person — the same person can appear on several parsed
	// rows (one per conference they're getting access to), grouped here by
	// email so their conferences list stacked under a single name/email
	// header instead of repeating it per row.
	const personGroups = $derived.by(() => {
		const groups: { firstName: string; lastName: string; email: string; indices: number[] }[] = [];
		const indexByEmail: Record<string, number> = {};
		importedRows.forEach((row, index) => {
			const key = row.email.toLowerCase();
			const groupIndex = indexByEmail[key];
			if (groupIndex !== undefined) {
				groups[groupIndex].indices.push(index);
			} else {
				indexByEmail[key] = groups.length;
				groups.push({
					firstName: row.firstName,
					lastName: row.lastName,
					email: row.email,
					indices: [index]
				});
			}
		});
		return groups;
	});

	// Editing only ever touches one row's conference — name/email came off
	// the spreadsheet and identify *which* person a row belongs to, so they
	// stay fixed here (changing them would just split that row into a second,
	// separate person instead of correcting the existing one).
	let editLineIndex = $state<number | null>(null);
	let editLineDialogOpen = $state(false);
	let editLineConferenceTitle = $state('');
	let editLineComboboxOpen = $state(false);
	let editLineSearchQuery = $state('');

	const availableConferencesForEditLine = $derived.by(() => {
		const query = editLineSearchQuery.trim().toLowerCase();
		return data.conferences.filter((c) => !query || c.title.toLowerCase().includes(query));
	});

	function openEditLine(index: number) {
		editLineIndex = index;
		editLineConferenceTitle = importedRows[index].conferenceName;
		editLineDialogOpen = true;
	}

	function chooseEditLineConference(title: string) {
		editLineConferenceTitle = title;
		editLineComboboxOpen = false;
		editLineSearchQuery = '';
	}

	function saveEditLine() {
		if (editLineIndex === null) return;
		importedRows[editLineIndex] = {
			...importedRows[editLineIndex],
			conferenceName: editLineConferenceTitle
		};
		editLineDialogOpen = false;
		editLineIndex = null;
	}

	let deleteLineIndex = $state<number | null>(null);
	let deleteLineDialogOpen = $state(false);

	function openDeleteLine(index: number) {
		deleteLineIndex = index;
		deleteLineDialogOpen = true;
	}

	function confirmDeleteLine() {
		if (deleteLineIndex === null) return;
		importedRows = importedRows.filter((_, i) => i !== deleteLineIndex);
		deleteLineDialogOpen = false;
		deleteLineIndex = null;
	}
</script>

<div class="mx-auto max-w-xl px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Nový uživatel</h1>
		<p class="mt-1 text-muted-foreground">
			Založí účet a pošle pozvánku k dokončení registrace. Konference mu můžete přidělit hned, bez
			čekání na registraci.
		</p>
	</div>

	<Tabs bind:value={activeTab} class="mt-8">
		<TabsList class="w-full">
			<TabsTrigger value="rucne" class="flex-1">Ručně</TabsTrigger>
			<TabsTrigger value="excel" class="flex-1">
				<FileSpreadsheet data-icon="inline-start" />
				Import z Excelu
			</TabsTrigger>
		</TabsList>

		<TabsContent value="rucne">
			<Card>
				<CardContent>
					<form
						method="POST"
						action="?/invite"
						class="flex flex-col gap-4"
						use:enhance={() => {
							submitting = true;
							return async ({ result }) => {
								if (result.type === 'redirect') {
									toast.success('Pozvánka byla úspěšně odeslána.');
									// eslint-disable-next-line svelte/no-navigation-without-resolve -- result.location is already a server-resolved path, not a route id
									await goto(result.location, { invalidateAll: true });
									return;
								}

								await applyAction(result);
								submitting = false;

								if (result.type === 'failure') {
									toast.error(
										(result.data?.error as string | undefined) ?? 'Pozvánku se nepodařilo odeslat.'
									);
								} else if (result.type === 'error') {
									toast.error('Něco se pokazilo. Zkuste to prosím znovu.');
								}
							};
						}}
					>
						<div class="flex gap-3">
							<div class="flex flex-1 flex-col gap-1.5">
								<Label for="firstName">Jméno <span class="text-destructive">*</span></Label>
								<Input id="firstName" name="firstName" required />
							</div>
							<div class="flex flex-1 flex-col gap-1.5">
								<Label for="lastName">Příjmení <span class="text-destructive">*</span></Label>
								<Input id="lastName" name="lastName" required />
							</div>
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="email">Email <span class="text-destructive">*</span></Label>
							<Input id="email" name="email" type="email" required />
						</div>

						<div class="flex flex-col gap-1.5">
							<Label for="conference-search">Konference (volitelné)</Label>
							<Popover bind:open={confComboboxOpen}>
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
												placeholder="Hledat konferenci…"
												autocomplete="off"
												bind:value={confSearchQuery}
												onclick={() => (confComboboxOpen = true)}
												oninput={() => (confComboboxOpen = true)}
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
									{#if availableConferencesForManual.length === 0}
										<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
									{:else}
										<div class="max-h-72 overflow-y-auto">
											{#each availableConferencesForManual as c (c.id)}
												<button
													type="button"
													class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
													onclick={() => addManualConference(c.title)}
												>
													<CirclePlus class="size-4 shrink-0 text-primary" />
													<span class="min-w-0 flex-1 truncate">{c.title}</span>
												</button>
											{/each}
										</div>
									{/if}
								</PopoverContent>
							</Popover>
							{#if selectedConferenceTitles.length > 0}
								<div class="mt-1 flex flex-col gap-1.5">
									{#each selectedConferenceTitles as title (title)}
										<div
											class="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"
										>
											<span class="min-w-0 truncate">{title}</span>
											<button
												type="button"
												class="cursor-pointer text-muted-foreground hover:text-foreground"
												aria-label="Odebrat {title}"
												onclick={() => removeManualConference(title)}
											>
												<X class="size-4" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
						<input
							type="hidden"
							name="conferenceTitles"
							value={JSON.stringify(selectedConferenceTitles)}
						/>

						{#if form?.error}
							<p class="text-sm text-destructive">{form.error}</p>
						{/if}
						<Button type="submit" class="w-full" disabled={submitting}>
							{submitting ? 'Odesílání…' : 'Odeslat pozvánku'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="excel" class="flex flex-col gap-3">
			<form
				method="POST"
				action="?/parseImport"
				enctype="multipart/form-data"
				use:enhance={() => {
					parsingFile = true;
					return async ({ result }) => {
						parsingFile = false;
						if (result.type === 'success') {
							importError = null;
							importedRows = (result.data?.importedRows as ImportRow[] | undefined) ?? [];
						} else if (result.type === 'failure') {
							importError =
								(result.data?.importError as string | undefined) ??
								'Soubor se nepodařilo zpracovat.';
						} else {
							await applyAction(result);
						}
					};
				}}
			>
				<input
					bind:this={fileInputEl}
					type="file"
					name="file"
					accept=".xlsx,.xls,.csv"
					class="hidden"
					onchange={(event) => {
						if ((event.currentTarget as HTMLInputElement).files?.length) {
							fileInputEl?.form?.requestSubmit();
						}
					}}
				/>

				{#if importedRows.length === 0}
					<Card>
						<CardContent class="flex flex-col items-center gap-3 py-10 text-center">
							<FileSpreadsheet class="size-8 text-muted-foreground" />
							<p class="text-sm text-muted-foreground">
								Nahrajte tabulku ve formátu .xlsx nebo .csv se sloupci jméno, příjmení, email a
								konference.
							</p>
							{#if importError}
								<p class="text-sm text-destructive">{importError}</p>
							{/if}
							<Button
								type="button"
								variant="outline"
								disabled={parsingFile}
								onclick={() => fileInputEl?.click()}
							>
								<FileSpreadsheet data-icon="inline-start" />
								{parsingFile ? 'Načítání…' : 'Vybrat soubor'}
							</Button>
						</CardContent>
					</Card>
				{/if}
			</form>

			{#if importedRows.length > 0}
				<div class="flex flex-col gap-2">
					{#each personGroups as group (group.email)}
						<Card>
							<CardContent class="flex flex-col gap-3">
								<div class="min-w-0">
									<p class="truncate font-semibold">{group.firstName} {group.lastName}</p>
									<p class="truncate text-sm text-muted-foreground">{group.email}</p>
								</div>
								<div class="flex flex-col gap-1.5 border-t pt-3">
									{#each group.indices as index (index)}
										{@const row = importedRows[index]}
										<div class="flex items-center justify-between gap-2">
											{#if row.conferenceName}
												<span class="min-w-0 truncate text-sm">{row.conferenceName}</span>
											{:else}
												<span class="text-sm text-muted-foreground">Bez konference</span>
											{/if}
											<div class="flex shrink-0 items-center gap-1.5">
												<Button
													variant="destructive"
													size="icon-xs"
													aria-label="Odebrat"
													onclick={() => openDeleteLine(index)}
												>
													<Trash2 class="size-3.5" />
												</Button>
												<Button
													variant="outline"
													size="icon-xs"
													aria-label="Upravit konferenci"
													onclick={() => openEditLine(index)}
												>
													<Pencil class="size-3.5" />
												</Button>
											</div>
										</div>
									{/each}
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>

				<form
					method="POST"
					action="?/importUsers"
					use:enhance={() => {
						importSubmitting = true;
						return async ({ result }) => {
							importSubmitting = false;
							if (result.type === 'success') {
								const imported = (result.data?.imported as number | undefined) ?? 0;
								const errors = (result.data?.errors as string[] | undefined) ?? [];
								if (imported > 0) {
									toast.success(`Importováno uživatelů: ${imported}.`);
								} else if (errors.length === 0) {
									toast.success('Přístupy byly přiděleny.');
								}
								if (errors.length > 0) toast.error(errors.join(' '));
								importedRows = [];
							} else {
								await applyAction(result);
								toast.error('Import se nezdařil.');
							}
						};
					}}
				>
					<input type="hidden" name="rows" value={JSON.stringify(importedRows)} />
					<Button type="submit" class="w-full" disabled={importSubmitting}>
						{importSubmitting ? 'Importuji…' : `Importovat (${personGroups.length})`}
					</Button>
				</form>
			{/if}

			<Card>
				<CardContent class="flex flex-col gap-4">
					<div>
						<h3 class="font-semibold">Jak má tabulka vypadat</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							Soubor musí mít v prvním řádku přesně tyto sloupce: Jméno, Příjmení, E-mail a
							Konference. Sloupec Konference je nepovinný a musí obsahovat přesný název konference.
							Pokud chcete jednomu uživateli přidělit víc konferencí, přidejte pro něj další řádek
							se stejným jménem a emailem, jen s jinou konferencí.
						</p>
					</div>
					<div class="overflow-x-auto rounded-lg border">
						<table class="w-full text-sm">
							<thead>
								<tr class="bg-muted">
									<th class="px-3 py-2 text-left font-semibold">Jméno</th>
									<th class="px-3 py-2 text-left font-semibold">Příjmení</th>
									<th class="px-3 py-2 text-left font-semibold">E-mail</th>
									<th class="px-3 py-2 text-left font-semibold">Konference</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-t">
									<td class="px-3 py-2">Jakub</td>
									<td class="px-3 py-2">Gregovský</td>
									<td class="px-3 py-2">gregovskyj@nember.cz</td>
									<td class="px-3 py-2">Podzimní konference 2026</td>
								</tr>
								<tr class="border-t">
									<td class="px-3 py-2">Jakub</td>
									<td class="px-3 py-2">Gregovský</td>
									<td class="px-3 py-2">gregovskyj@nember.cz</td>
									<td class="px-3 py-2">Letní workshop</td>
								</tr>
							</tbody>
						</table>
					</div>
					<Button
						href="/sablony/import-uzivatelu.xlsx"
						download
						variant="outline"
						class="self-start"
					>
						<Download data-icon="inline-start" />
						Stáhnout prázdnou šablonu
					</Button>
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</div>

<Dialog bind:open={editLineDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Upravit konferenci</DialogTitle>
		</DialogHeader>
		<div class="flex flex-col gap-4">
			<div class="flex gap-3">
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="edit-line-firstName">Jméno</Label>
					<Input
						id="edit-line-firstName"
						value={editLineIndex !== null ? importedRows[editLineIndex]?.firstName : ''}
						disabled
					/>
				</div>
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="edit-line-lastName">Příjmení</Label>
					<Input
						id="edit-line-lastName"
						value={editLineIndex !== null ? importedRows[editLineIndex]?.lastName : ''}
						disabled
					/>
				</div>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="edit-line-email">Email</Label>
				<Input
					id="edit-line-email"
					value={editLineIndex !== null ? importedRows[editLineIndex]?.email : ''}
					disabled
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="edit-line-conference-search">Konference</Label>
				<Popover bind:open={editLineComboboxOpen}>
					<PopoverTrigger>
						{#snippet child({ props })}
							<div class="relative">
								<Search
									class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									{...omitTriggerHandlers(props)}
									id="edit-line-conference-search"
									type="text"
									placeholder="Hledat konferenci…"
									autocomplete="off"
									bind:value={editLineSearchQuery}
									onclick={() => (editLineComboboxOpen = true)}
									oninput={() => (editLineComboboxOpen = true)}
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
						{#if availableConferencesForEditLine.length === 0}
							<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
						{:else}
							<div class="max-h-72 overflow-y-auto">
								{#each availableConferencesForEditLine as c (c.id)}
									<button
										type="button"
										class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
										onclick={() => chooseEditLineConference(c.title)}
									>
										<CirclePlus class="size-4 shrink-0 text-primary" />
										<span class="min-w-0 flex-1 truncate">{c.title}</span>
									</button>
								{/each}
							</div>
						{/if}
					</PopoverContent>
				</Popover>
				{#if editLineConferenceTitle}
					<div
						class="mt-1 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"
					>
						<span class="min-w-0 truncate">{editLineConferenceTitle}</span>
						<button
							type="button"
							class="cursor-pointer text-muted-foreground hover:text-foreground"
							aria-label="Odebrat"
							onclick={() => (editLineConferenceTitle = '')}
						>
							<X class="size-4" />
						</button>
					</div>
				{/if}
			</div>
			<DialogFooter>
				<Button type="button" variant="ghost" onclick={() => (editLineDialogOpen = false)}>
					Zrušit
				</Button>
				<Button type="button" onclick={saveEditLine}>Uložit</Button>
			</DialogFooter>
		</div>
	</DialogContent>
</Dialog>

<AlertDialog bind:open={deleteLineDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Odebrat ze seznamu</AlertDialogTitle>
			<AlertDialogDescription>
				{#if deleteLineIndex !== null}
					{@const row = importedRows[deleteLineIndex]}
					Opravdu chcete odebrat {row.conferenceName
						? `konferenci „${row.conferenceName}“ u`
						: 'záznam pro'}
					{row.firstName}
					{row.lastName}?
				{:else}
					Opravdu chcete odebrat tento záznam?
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel type="button" variant="ghost">Zrušit</AlertDialogCancel>
			<AlertDialogAction type="button" variant="destructive" onclick={confirmDeleteLine}>
				Ano
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
