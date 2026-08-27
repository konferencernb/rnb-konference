<script lang="ts">
	import { resolve } from '$app/paths';
	import ErrorPage from '$lib/components/error-page.svelte';
</script>

<!--
	This is the last-resort error page — it renders when nothing more specific
	up the route tree caught the error (e.g. an unmatched URL, or a failure
	inside a route group's own layout). It isn't nested inside any layout
	that provides flex sizing, so it wraps itself in one instead of relying
	on a parent, unlike the (public)/admin variants of this same component.
-->
<div class="flex min-h-screen flex-col">
	<ErrorPage homeHref={resolve('/')} />
</div>
