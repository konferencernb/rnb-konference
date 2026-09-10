<script lang="ts">
	import Footer from '$lib/components/footer.svelte';
	import Navbar from '$lib/components/navbar.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div class="public-shell flex min-h-screen flex-col">
	<Navbar user={data.user} />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>

<style>
	/* Best-effort discouragement of casual image lifting on the public site:
	no drag-to-save, no selection, no long-press/right-click "save image".
	Not real DRM — a screenshot or devtools still works — just makes it
	non-trivial. Scoped to the public shell so admin stays untouched. */
	.public-shell :global(img),
	.public-shell :global(picture) {
		-webkit-user-drag: none;
		-webkit-touch-callout: none;
		user-select: none;
		pointer-events: none;
	}
</style>
