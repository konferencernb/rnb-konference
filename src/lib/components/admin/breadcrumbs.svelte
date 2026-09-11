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

	let { items }: { items: { label: string; href?: string }[] } = $props();
</script>

<Breadcrumb>
	<BreadcrumbList class="flex-nowrap">
		<BreadcrumbItem>
			<BreadcrumbLink href={resolve('/admin/dashboard')} aria-label="Dashboard">
				<House class="size-4" />
			</BreadcrumbLink>
		</BreadcrumbItem>
		{#each items as item, index (item.label)}
			<BreadcrumbSeparator>/</BreadcrumbSeparator>
			<BreadcrumbItem>
				{#if item.href && index < items.length - 1}
					<BreadcrumbLink href={item.href} class="max-w-48 truncate">{item.label}</BreadcrumbLink>
				{:else}
					<BreadcrumbPage class="max-w-48 truncate">{item.label}</BreadcrumbPage>
				{/if}
			</BreadcrumbItem>
		{/each}
	</BreadcrumbList>
</Breadcrumb>
