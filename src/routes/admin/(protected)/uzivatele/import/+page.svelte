<script lang="ts">
	import ExcelUserImport from '$lib/components/admin/excel-user-import.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto flex max-w-xl flex-col gap-3 px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Import z Excelu</h1>
		<p class="mt-1 text-muted-foreground">
			Hromadně založí uživatele (nebo najde ty existující podle emailu) a pošle jim pozvánku k
			registraci. Přístup ke konferencím se přiděluje zvlášť.
		</p>
	</div>

	<ExcelUserImport existingEmails={data.existingEmails} withConference={false} />
</div>
