<script lang="ts">
	import type { Component } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	let {
		icon: Icon,
		title,
		description
	}: { icon: Component; title: string; description: string } = $props();
</script>

<Card>
	<CardContent class="flex flex-col gap-3">
		<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
			<Icon class="size-5" />
		</div>
		<h3 class="font-semibold">{title}</h3>
		<p class="text-sm text-muted-foreground">{description}</p>
	</CardContent>
</Card>
