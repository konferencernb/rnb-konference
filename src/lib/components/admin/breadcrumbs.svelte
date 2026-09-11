<script lang="ts">
	import { resolve } from '$app/paths';
	import House from '@lucide/svelte/icons/house';
	import {
		Breadcrumb,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbList,
		BreadcrumbPage,
		BreadcrumbSeparator
	} from '$lib/components/ui/breadcrumb';

	let { items, class: className }: { items: { label: string; href?: string }[]; class?: string } =
		$props();
</script>

<Breadcrumb class="min-w-0 {className ?? ''}">
	<BreadcrumbList class="flex-nowrap">
		<BreadcrumbItem class="shrink-0">
			<BreadcrumbLink href={resolve('/admin/dashboard')} aria-label="Dashboard">
				<House class="size-4" />
			</BreadcrumbLink>
		</BreadcrumbItem>
		{#each items as item, index (item.label)}
			<BreadcrumbSeparator class="shrink-0">/</BreadcrumbSeparator>
			<BreadcrumbItem class="min-w-0">
				{#if item.href && index < items.length - 1}
					<BreadcrumbLink href={item.href} class="block max-w-32 truncate sm:max-w-48"
						>{item.label}</BreadcrumbLink
					>
				{:else}
					<BreadcrumbPage class="block max-w-32 truncate sm:max-w-48">{item.label}</BreadcrumbPage>
				{/if}
			</BreadcrumbItem>
		{/each}
	</BreadcrumbList>
</Breadcrumb>
