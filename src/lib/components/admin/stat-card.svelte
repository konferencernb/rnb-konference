<script lang="ts">
	import type { Component } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	let { icon: Icon, label, value }: { icon: Component; label: string; value: number } = $props();
</script>

<Card>
	<CardContent class="flex items-center justify-between">
		<div>
			<p class="text-sm text-muted-foreground">{label}</p>
			<p class="mt-1 text-2xl font-bold">{value}</p>
		</div>
		<Icon class="size-5 text-muted-foreground" />
	</CardContent>
</Card>
