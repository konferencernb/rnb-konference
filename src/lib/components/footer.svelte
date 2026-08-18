<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<footer class="border-t bg-muted/30">
	<div
		class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<p class="font-semibold">Nemocnice Beroun</p>
			<p class="text-sm text-muted-foreground">
				Platforma pro zabezpečené online odborné konference.
			</p>
		</div>
		<nav class="flex items-center gap-6 text-sm">
			<a href={resolve('/konference')} class="text-muted-foreground hover:text-foreground">
				Archiv konferencí
			</a>
			<a href={resolve('/admin')} class="text-muted-foreground hover:text-foreground">
				Administrace
			</a>
		</nav>
	</div>
</footer>
