<script lang="ts">
	import type { Component } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	let {
		icon: Icon,
		label,
		value
	}: { icon: Component; label: string; value: number | string } = $props();
</script>

<Card>
	<CardContent class="flex items-center gap-4">
		<span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
			<Icon class="size-5 text-primary" />
		</span>
		<div class="min-w-0">
			<p class="text-sm text-muted-foreground">{label}</p>
			<p class="mt-0.5 text-2xl font-bold">{value}</p>
		</div>
	</CardContent>
</Card>
