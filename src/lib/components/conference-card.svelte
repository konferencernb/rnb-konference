<script lang="ts">
	import Calendar from '@lucide/svelte/icons/calendar';
	import Lock from '@lucide/svelte/icons/lock';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import type { Conference } from '$lib/data/conferences';

	let { conference }: { conference: Conference } = $props();

	const statusLabel: Record<Conference['status'], string> = {
		live: 'Živě',
		upcoming: 'Připravuje se',
		archived: 'Archivováno'
	};

	const statusVariant: Record<Conference['status'], BadgeVariant> = {
		live: 'destructive',
		upcoming: 'secondary',
		archived: 'outline'
	};
</script>

<Card class="gap-0 overflow-hidden py-0">
	<div
		class="aspect-3/2 w-full bg-linear-to-br from-accent-soft via-background to-accent-soft-2"
	></div>
	<CardContent class="flex flex-1 flex-col gap-3 pt-4 pb-4">
		<div class="flex items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-sm text-muted-foreground">
				<Calendar class="size-4" />
				{conference.date}
			</span>
			<Badge variant={statusVariant[conference.status]}>{statusLabel[conference.status]}</Badge>
		</div>
		<div>
			<h3 class="text-lg font-semibold">{conference.title}</h3>
			<p class="text-sm text-muted-foreground">{conference.description}</p>
		</div>
		<Button class="mt-1 w-full">
			<Lock data-icon="inline-start" />
			Otevřít konferenci
		</Button>
	</CardContent>
</Card>
