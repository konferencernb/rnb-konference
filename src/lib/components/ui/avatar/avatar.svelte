<script lang="ts">
	import { Avatar as AvatarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		loadingStatus = $bindable('loading'),
		size = 'default',
		class: className,
		children,
		...restProps
	}: AvatarPrimitive.RootProps & {
		size?: 'default' | 'sm' | 'lg';
	} = $props();
</script>

<AvatarPrimitive.Root
	bind:ref
	bind:loadingStatus
	data-slot="avatar"
	data-size={size}
	class={cn(
		'group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten',
		className
	)}
	{...restProps}
>
	{#snippet child({ props })}
		<!-- A plain <div> (bits-ui's default here) is invalid HTML whenever an
		avatar sits inside a <button> (e.g. a dropdown trigger) — button's
		content model is phrasing content only. <span> renders identically
		but stays valid there. -->
		<span {...props}>
			{@render children?.()}
		</span>
	{/snippet}
</AvatarPrimitive.Root>
