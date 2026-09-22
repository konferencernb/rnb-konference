<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { applyAction, enhance } from '$app/forms';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
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
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '$lib/components/ui/collapsible';
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

	type ImportRow = { firstName: string; lastName: string; email: string; conferenceName: string };

	let {
		conferences = [],
		existingEmails,
		withConference = true
	}: {
		conferences?: { id: string; title: string }[];
		existingEmails: string[];
		withConference?: boolean;
	} = $props();

	function isNewUser(email: string) {
		return !existingEmails.some((e) => e.toLowerCase() === email.toLowerCase());
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

	let fileInputEl = $state<HTMLInputElement>();
	let parsingFile = $state(false);
	let importError = $state<string | null>(null);
	let importedRows = $state<ImportRow[]>([]);
	let importSubmitting = $state(false);
	let importSummary = $state<{
		imported: number;
		emailsSent: number;
		emailsFailed: number;
		failedEmails: string[];
		errors: string[];
	} | null>(null);

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

	// Whether a row's conference name matches an actual (active) conference —
	// same exact-title comparison grantConferenceByTitle does server-side, so
	// this predicts exactly what would fail at import time instead of the
	// admin only finding out from the post-import error summary.
	function isConferenceMatched(conferenceName: string) {
		return conferences.some((c) => c.title === conferenceName);
	}

	// Blocks the import outright (not just a post-import error) — a row with
	// no conference, or one that doesn't match any real conference, can never
	// grant anything, so letting it through would silently create the person
	// without the access the admin thinks they're granting.
	const unresolvedCount = $derived(
		withConference
			? importedRows.filter(
					(row) => !row.conferenceName || !isConferenceMatched(row.conferenceName)
				).length
			: 0
	);

	// Jméno/příjmení/email are only editable for a brand-new person (isNewUser)
	// — those values are about to create the account, so a typo here is worth
	// fixing before import. For an existing account they're locked: the row
	// only *matched* that person by email, editing the name here wouldn't
	// rename the real account, so allowing it would be misleading. Applies to
	// every row in the group at once (all of a person's rows share one
	// identity), keyed by the group's original email rather than an index
	// since editing the email itself changes which group a row belongs to.
	let editPersonIndices = $state<number[] | null>(null);
	let editPersonDialogOpen = $state(false);
	let editPersonFirstName = $state('');
	let editPersonLastName = $state('');
	let editPersonEmail = $state('');

	function openEditPerson(group: {
		firstName: string;
		lastName: string;
		email: string;
		indices: number[];
	}) {
		editPersonIndices = group.indices;
		editPersonFirstName = group.firstName;
		editPersonLastName = group.lastName;
		editPersonEmail = group.email;
		editPersonDialogOpen = true;
	}

	function saveEditPerson() {
		if (!editPersonIndices) return;
		const firstName = editPersonFirstName.trim();
		const lastName = editPersonLastName.trim();
		const email = editPersonEmail.trim();
		for (const index of editPersonIndices) {
			importedRows[index] = { ...importedRows[index], firstName, lastName, email };
		}
		editPersonDialogOpen = false;
		editPersonIndices = null;
	}

	// Editing only ever touches one row's conference — the row's own
	// firstName/lastName/email just identify *which* person it belongs to
	// (see openEditPerson above for changing those), so they stay fixed here.
	let editLineIndex = $state<number | null>(null);
	let editLineDialogOpen = $state(false);
	let editLineConferenceTitle = $state('');
	let editLineComboboxOpen = $state(false);
	let editLineSearchQuery = $state('');

	const availableConferencesForEditLine = $derived.by(() => {
		const query = editLineSearchQuery.trim().toLowerCase();
		return conferences.filter((c) => !query || c.title.toLowerCase().includes(query));
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
				importSummary = null;
				importedRows = (result.data?.importedRows as ImportRow[] | undefined) ?? [];
			} else if (result.type === 'failure') {
				importError =
					(result.data?.importError as string | undefined) ?? 'Soubor se nepodařilo zpracovat.';
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
					Nahrajte tabulku ve formátu .xlsx nebo .csv se sloupci jméno, příjmení a email{withConference
						? ' a konference'
						: ''}.
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
	{#if unresolvedCount > 0}
		<p class="text-sm text-destructive">
			{unresolvedCount}× chybí nebo se nepodařilo dohledat konference podle názvu — dokud je
			neopravíte tužkou u daného řádku, import nepůjde spustit.
		</p>
	{/if}
	<div class="flex flex-col gap-2">
		{#each personGroups as group (group.email)}
			<Card>
				<CardContent class="flex flex-col gap-3">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<p class={['truncate font-semibold', isNewUser(group.email) && 'text-destructive']}>
								{group.firstName}
								{group.lastName}
							</p>
							<p class="truncate text-sm text-muted-foreground">{group.email}</p>
							{#if isNewUser(group.email)}
								<p class="text-xs text-destructive">
									Nový uživatel — účet i pozvánka k registraci se založí automaticky.
								</p>
							{/if}
						</div>
						{#if isNewUser(group.email)}
							<Button
								variant="outline"
								size="icon-xs"
								class="shrink-0"
								aria-label="Upravit jméno a email"
								onclick={() => openEditPerson(group)}
							>
								<Pencil class="size-3.5" />
							</Button>
						{/if}
					</div>
					{#if withConference}
						<div class="flex flex-col gap-1.5 border-t pt-3">
							{#each group.indices as index (index)}
								{@const row = importedRows[index]}
								<div class="flex items-center justify-between gap-2">
									{#if !row.conferenceName}
										<span class="text-sm text-destructive">Chybí konference</span>
									{:else if !isConferenceMatched(row.conferenceName)}
										<span class="min-w-0 truncate text-sm text-destructive">
											Nenalezeno: „{row.conferenceName}“
										</span>
									{:else}
										<span class="min-w-0 truncate text-sm">{row.conferenceName}</span>
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
					{:else}
						<div class="flex justify-end border-t pt-3">
							<Button
								variant="destructive"
								size="icon-xs"
								aria-label="Odebrat"
								onclick={() => openDeleteLine(group.indices[0])}
							>
								<Trash2 class="size-3.5" />
							</Button>
						</div>
					{/if}
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
					const data = result.data as
						| {
								imported: number;
								emailsSent: number;
								emailsFailed: number;
								failedEmails: string[];
								errors: string[];
						  }
						| undefined;
					importSummary = data ?? null;
					importedRows = [];
					if (data && (data.imported > 0 || data.emailsSent > 0)) {
						toast.success(`Importováno uživatelů: ${data.imported}.`);
					} else if (data && data.errors.length === 0 && data.emailsFailed === 0) {
						toast.success('Přístupy byly přiděleny.');
					}
					if (data && data.errors.length > 0) toast.error(data.errors.join(' '));
				} else {
					await applyAction(result);
					toast.error('Import se nezdařil.');
				}
			};
		}}
	>
		<input type="hidden" name="rows" value={JSON.stringify(importedRows)} />
		<Button type="submit" class="w-full" disabled={importSubmitting || unresolvedCount > 0}>
			{importSubmitting ? 'Importuji…' : `Importovat (${personGroups.length})`}
		</Button>
	</form>
{/if}

{#if importSummary}
	<Card>
		<CardContent class="flex flex-col gap-2">
			<h3 class="font-semibold">Výsledek importu</h3>
			<p class="text-sm text-muted-foreground">
				Nově vytvořeno uživatelů: {importSummary.imported}
			</p>
			<p class="text-sm text-muted-foreground">
				E-mailů úspěšně odesláno: {importSummary.emailsSent}
			</p>
			{#if importSummary.emailsFailed > 0}
				<p class="text-sm text-destructive">
					E-mailů se nepodařilo odeslat: {importSummary.emailsFailed}
				</p>
				<ul class="list-inside list-disc text-sm text-destructive">
					{#each importSummary.failedEmails as email (email)}
						<li>{email}</li>
					{/each}
				</ul>
			{/if}
			{#if importSummary.errors.length > 0}
				<ul class="list-inside list-disc text-sm text-destructive">
					{#each importSummary.errors as error (error)}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}
		</CardContent>
	</Card>
{/if}

<Card>
	<CardContent>
		<Collapsible>
			<CollapsibleTrigger
				class="group flex w-full cursor-pointer items-center justify-between gap-2 text-left"
			>
				<h3 class="font-semibold">Jak má tabulka vypadat?</h3>
				<ChevronDown
					class="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent class="flex flex-col gap-4 pt-4">
				<div>
					{#if withConference}
						<p class="text-sm text-muted-foreground">
							Soubor musí mít v prvním řádku přesně tyto sloupce: Jméno, Příjmení, E-mail a
							Konference. Ve sloupci Konference se ve šabloně níže vybírá z rozbalovacího seznamu —
							názvy konferencí se píší na druhý list „Konference“, takže se nedá překlepnout. Pokud
							chcete jednomu uživateli přidělit víc konferencí, přidejte pro něj další řádek se
							stejným jménem a emailem, jen s jinou konferencí.
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">
							Soubor musí mít v prvním řádku přesně tyto sloupce: Jméno, Příjmení a E-mail. Založí
							uživatelům účty (nebo najde ty existující podle emailu) — přístup ke konferencím se
							přiděluje zvlášť.
						</p>
					{/if}
				</div>
				<div class="overflow-x-auto rounded-lg border">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-muted">
								<th class="px-3 py-2 text-left font-semibold">Jméno</th>
								<th class="px-3 py-2 text-left font-semibold">Příjmení</th>
								<th class="px-3 py-2 text-left font-semibold">E-mail</th>
								{#if withConference}
									<th class="px-3 py-2 text-left font-semibold">Konference</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							<tr class="border-t">
								<td class="px-3 py-2">Jakub</td>
								<td class="px-3 py-2">Gregovský</td>
								<td class="px-3 py-2">gregovskyj@nember.cz</td>
								{#if withConference}
									<td class="px-3 py-2">Podzimní konference 2026</td>
								{/if}
							</tr>
							{#if withConference}
								<tr class="border-t">
									<td class="px-3 py-2">Jakub</td>
									<td class="px-3 py-2">Gregovský</td>
									<td class="px-3 py-2">gregovskyj@nember.cz</td>
									<td class="px-3 py-2">Letní workshop</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
				<Button
					href={withConference ? '/sablony/import-uzivatelu.xlsx' : '/sablony/import-pristupu.xlsx'}
					download
					variant="outline"
					class="self-start"
				>
					<Download data-icon="inline-start" />
					Stáhnout prázdnou šablonu
				</Button>
			</CollapsibleContent>
		</Collapsible>
	</CardContent>
</Card>

<Dialog bind:open={editPersonDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Upravit uživatele</DialogTitle>
		</DialogHeader>
		<div class="flex min-w-0 flex-col gap-4">
			<div class="flex gap-3">
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="edit-person-firstName">Jméno</Label>
					<Input id="edit-person-firstName" bind:value={editPersonFirstName} />
				</div>
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="edit-person-lastName">Příjmení</Label>
					<Input id="edit-person-lastName" bind:value={editPersonLastName} />
				</div>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="edit-person-email">Email</Label>
				<Input id="edit-person-email" type="email" bind:value={editPersonEmail} />
			</div>
			<DialogFooter>
				<Button type="button" variant="ghost" onclick={() => (editPersonDialogOpen = false)}>
					Zrušit
				</Button>
				<Button type="button" onclick={saveEditPerson}>Uložit</Button>
			</DialogFooter>
		</div>
	</DialogContent>
</Dialog>

{#if withConference}
	<Dialog bind:open={editLineDialogOpen}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Upravit konferenci</DialogTitle>
			</DialogHeader>
			<div class="flex min-w-0 flex-col gap-4">
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
{/if}

<AlertDialog bind:open={deleteLineDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Odebrat ze seznamu</AlertDialogTitle>
			<AlertDialogDescription>
				{#if deleteLineIndex !== null}
					{@const row = importedRows[deleteLineIndex]}
					{#if row.conferenceName}
						Opravdu chcete odebrat konferenci u {row.firstName}
						{row.lastName}?
						<span class="mt-1 block truncate font-medium text-foreground"
							>„{row.conferenceName}“</span
						>
					{:else}
						Opravdu chcete odebrat záznam pro {row.firstName} {row.lastName}?
					{/if}
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
