<script lang="ts">
	import { page } from '$app/state';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import ServerCrash from '@lucide/svelte/icons/server-crash';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '$lib/components/ui/button';

	let { homeHref, homeLabel = 'Zpět na hlavní stránku' }: { homeHref: string; homeLabel?: string } =
		$props();

	const status = $derived(page.status);
	const message = $derived(page.error?.message);

	// Content per status code — falls through to a generic message for
	// anything not explicitly listed, so a status we didn't think of still
	// gets a reasonable (if generic) page instead of a blank one.
	const content = $derived.by(() => {
		if (status === 404) {
			return {
				icon: FileQuestion,
				title: 'Stránka nenalezena',
				description: 'Stránka, kterou hledáte, neexistuje nebo byla přesunuta jinam.'
			};
		}
		if (status === 401) {
			return {
				icon: ShieldAlert,
				title: 'Nejste přihlášeni',
				description: 'Pro zobrazení této stránky se musíte nejprve přihlásit.'
			};
		}
		if (status === 403) {
			return {
				icon: ShieldAlert,
				title: 'Přístup odepřen',
				description: 'Nemáte oprávnění k zobrazení této stránky.'
			};
		}
		if (status === 400) {
			return {
				icon: TriangleAlert,
				title: 'Neplatný požadavek',
				description: message || 'Požadavek nešlo zpracovat — zkontrolujte prosím zadané údaje.'
			};
		}
		if (status >= 500) {
			return {
				icon: ServerCrash,
				title: 'Něco se pokazilo',
				description: 'Na serveru došlo k neočekávané chybě. Zkuste to prosím znovu později.'
			};
		}
		return {
			icon: TriangleAlert,
			title: 'Došlo k chybě',
			description: message || 'Omlouváme se, něco se nepovedlo.'
		};
	});
	const Icon = $derived(content.icon);
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
	<span class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
		<Icon class="size-8" />
	</span>
	<div class="flex flex-col gap-2">
		<p class="text-sm font-medium text-muted-foreground">Chyba {status}</p>
		<h1 class="text-2xl font-bold">{content.title}</h1>
		<p class="max-w-md text-muted-foreground">{content.description}</p>
	</div>
	<Button href={homeHref}>{homeLabel}</Button>
</div>
