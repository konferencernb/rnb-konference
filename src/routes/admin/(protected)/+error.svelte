<script lang="ts">
	import { resolve } from '$app/paths';
	import ErrorPage from '$lib/components/error-page.svelte';
</script>

<ErrorPage homeHref={resolve('/admin/dashboard')} homeLabel="Zpět na dashboard" />
