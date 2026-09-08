<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const tabs = $derived([
		{
			label: 'Detail',
			href: resolve('/admin/(protected)/konference/[id]', { id: data.conference.id })
		},
		{
			label: 'Sledovat',
			href: resolve('/admin/(protected)/konference/[id]/sledovat', { id: data.conference.id })
		},
		{
			label: 'Přístupy',
			href: resolve('/admin/(protected)/konference/[id]/pristupy', { id: data.conference.id })
		}
	]);
</script>

<div class="mx-auto max-w-6xl px-6 py-10">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{data.conference.title}</h1>
		<Button href={resolve('/admin/konference')} variant="outline">
			<ArrowLeft data-icon="inline-start" />
			Zpět
		</Button>
	</div>

	<div class="mt-6 flex gap-4 border-b border-border">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class={cn(
					'-mb-px border-b-2 px-1 py-2 text-sm font-medium transition-colors',
					page.url.pathname === tab.href
						? 'border-primary text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}
			>
				{tab.label}
			</a>
		{/each}
	</div>

	<div class="mt-8">
		{@render children()}
	</div>
</div>
