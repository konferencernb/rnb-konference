<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import Download from '@lucide/svelte/icons/download';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
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
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import type { ActionData } from './$types';

	type ImportRow = { firstName: string; lastName: string; email: string };

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
	let activeTab = $state('rucne');

	let fileInputEl = $state<HTMLInputElement>();
	let parsingFile = $state(false);
	let importError = $state<string | null>(null);
	let importedRows = $state<ImportRow[]>([]);
	let importSubmitting = $state(false);

	let editRowIndex = $state<number | null>(null);
	let editRowDialogOpen = $state(false);
	let editRowFirstName = $state('');
	let editRowLastName = $state('');
	let editRowEmail = $state('');

	let deleteRowIndex = $state<number | null>(null);
	let deleteRowDialogOpen = $state(false);

	function openEditRow(index: number) {
		const row = importedRows[index];
		editRowIndex = index;
		editRowFirstName = row.firstName;
		editRowLastName = row.lastName;
		editRowEmail = row.email;
		editRowDialogOpen = true;
	}

	function saveEditRow() {
		if (editRowIndex === null) return;
		importedRows[editRowIndex] = {
			firstName: editRowFirstName,
			lastName: editRowLastName,
			email: editRowEmail
		};
		editRowDialogOpen = false;
		editRowIndex = null;
	}

	function openDeleteRow(index: number) {
		deleteRowIndex = index;
		deleteRowDialogOpen = true;
	}

	function confirmDeleteRow() {
		if (deleteRowIndex === null) return;
		importedRows = importedRows.filter((_, i) => i !== deleteRowIndex);
		deleteRowDialogOpen = false;
		deleteRowIndex = null;
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
								Nahrajte tabulku ve formátu .xlsx nebo .csv se sloupci jméno, příjmení a email.
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
					{#each importedRows as row, index (index)}
						<Card>
							<CardContent class="flex items-center justify-between gap-4">
								<div class="min-w-0">
									<p class="truncate font-semibold">{row.firstName} {row.lastName}</p>
									<p class="truncate text-sm text-muted-foreground">{row.email}</p>
								</div>
								<div class="flex shrink-0 items-center gap-2">
									<Button
										variant="destructive"
										size="icon"
										aria-label="Odebrat ze seznamu"
										onclick={() => openDeleteRow(index)}
									>
										<Trash2 class="size-4" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										aria-label="Upravit"
										onclick={() => openEditRow(index)}
									>
										<Pencil class="size-4" />
									</Button>
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
								if (imported > 0) toast.success(`Importováno uživatelů: ${imported}.`);
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
						{importSubmitting ? 'Importuji…' : `Importovat (${importedRows.length})`}
					</Button>
				</form>
			{/if}

			<Card>
				<CardContent class="flex flex-col gap-4">
					<div>
						<h3 class="font-semibold">Jak má tabulka vypadat</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							Soubor musí mít v prvním řádku přesně tyto sloupce: Jméno, Příjmení a E-mail. Každý
							další řádek je jeden uživatel.
						</p>
					</div>
					<div class="overflow-x-auto rounded-lg border">
						<table class="w-full text-sm">
							<thead>
								<tr class="bg-muted">
									<th class="px-3 py-2 text-left font-semibold">Jméno</th>
									<th class="px-3 py-2 text-left font-semibold">Příjmení</th>
									<th class="px-3 py-2 text-left font-semibold">E-mail</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-t">
									<td class="px-3 py-2">Jakub</td>
									<td class="px-3 py-2">Gregovský</td>
									<td class="px-3 py-2">gregovskyj@nember.cz</td>
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

<Dialog bind:open={editRowDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Upravit uživatele</DialogTitle>
		</DialogHeader>
		<div class="flex flex-col gap-4">
			<div class="flex gap-3">
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="import-edit-firstName">Jméno</Label>
					<Input id="import-edit-firstName" bind:value={editRowFirstName} />
				</div>
				<div class="flex flex-1 flex-col gap-1.5">
					<Label for="import-edit-lastName">Příjmení</Label>
					<Input id="import-edit-lastName" bind:value={editRowLastName} />
				</div>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="import-edit-email">Email</Label>
				<Input id="import-edit-email" type="email" bind:value={editRowEmail} />
			</div>
			<DialogFooter>
				<Button type="button" variant="ghost" onclick={() => (editRowDialogOpen = false)}>
					Zrušit
				</Button>
				<Button type="button" onclick={saveEditRow}>Uložit</Button>
			</DialogFooter>
		</div>
	</DialogContent>
</Dialog>

<AlertDialog bind:open={deleteRowDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Odebrat ze seznamu</AlertDialogTitle>
			<AlertDialogDescription>
				Opravdu chcete odebrat {deleteRowIndex !== null
					? `${importedRows[deleteRowIndex]?.firstName} ${importedRows[deleteRowIndex]?.lastName}`
					: 'tento řádek'} ze seznamu k importu?
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel type="button" variant="ghost">Zrušit</AlertDialogCancel>
			<AlertDialogAction type="button" variant="destructive" onclick={confirmDeleteRow}>
				Ano
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
