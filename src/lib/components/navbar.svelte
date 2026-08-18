<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Activity from '@lucide/svelte/icons/activity';
	import { Button } from '$lib/components/ui/button';

	const links = [
		{ href: resolve('/'), label: 'Úvod' },
		{ href: resolve('/konference'), label: 'Konference' }
	];
</script>

<header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
		<a href={resolve('/')} class="flex items-center gap-3">
			<span
				class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<Activity class="size-5" />
			</span>
			<span class="flex flex-col leading-tight">
				<span class="font-semibold">Nemocnice Beroun</span>
				<span class="text-xs tracking-wide text-muted-foreground uppercase">Online konference</span>
			</span>
		</a>
		<nav class="flex items-center gap-1">
			{#each links as link (link.href)}
				<Button href={link.href} variant={page.url.pathname === link.href ? 'secondary' : 'ghost'}>
					{link.label}
				</Button>
			{/each}
		</nav>
	</div>
</header>
