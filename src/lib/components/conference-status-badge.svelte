<script lang="ts">
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';

	type Status = 'upcoming' | 'live' | 'ended';

	let { status }: { status: Status } = $props();

	const statusLabel: Record<Status, string> = {
		live: 'Živě',
		upcoming: 'Připravuje se',
		ended: 'Ukončeno'
	};

	const statusVariant: Record<Status, BadgeVariant> = {
		live: 'destructive',
		upcoming: 'secondary',
		ended: 'outline'
	};
</script>

<Badge
	variant={statusVariant[status]}
	class={status === 'live' ? 'animate-[badge-glow_1.8s_ease-in-out_infinite]' : ''}
>
	{#if status === 'live'}
		<span class="size-1.5 rounded-full bg-destructive"></span>
	{/if}
	{statusLabel[status]}
</Badge>
