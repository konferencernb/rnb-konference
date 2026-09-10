<script lang="ts">
	import type { Component } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	let {
		icon: Icon,
		title,
		description
	}: { icon: Component; title: string; description: string } = $props();
</script>

<Card class="transition-shadow hover:shadow-md">
	<CardContent class="flex flex-col gap-3">
		<div class="flex items-center gap-3">
			<div
				class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/70 text-primary-foreground"
			>
				<Icon class="size-5" />
			</div>
			<h3 class="font-semibold tracking-tight">{title}</h3>
		</div>
		<p class="text-sm text-muted-foreground">{description}</p>
	</CardContent>
</Card>
