<script lang="ts">
	import Footer from '$lib/components/footer.svelte';
	import Navbar from '$lib/components/navbar.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<Navbar />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>
