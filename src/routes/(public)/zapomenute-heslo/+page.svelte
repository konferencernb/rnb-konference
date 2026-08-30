<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let email = $state('');
	let submitting = $state(false);
	let submitted = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;

		await fetch('/api/zapomenute-heslo', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});

		// Always shows the same confirmation regardless of whether the address
		// matched an account — same anti-enumeration reasoning as the endpoint
		// itself, so this page can't be used to check who has an account here.
		submitting = false;
		submitted = true;
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center px-6 py-16">
	<Card class="w-full max-w-sm">
		<CardContent class="flex flex-col gap-5">
			{#if submitted}
				<div class="text-center">
					<h1 class="text-xl font-semibold">Zkontrolujte si e-mail</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Pokud pod adresou {email} existuje účet, poslali jsme na ni odkaz pro nastavení nového hesla.
					</p>
				</div>
			{:else}
				<div class="text-center">
					<h1 class="text-xl font-semibold">Zapomenuté heslo</h1>
					<p class="text-sm text-muted-foreground">
						Zadejte e-mail, na který vám pošleme odkaz pro nastavení nového hesla.
					</p>
				</div>
				<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
					<div class="flex flex-col gap-1.5">
						<Label for="email">E-mail</Label>
						<Input id="email" type="email" autocomplete="email" bind:value={email} required />
					</div>
					<Button type="submit" class="w-full" disabled={submitting}>
						{submitting ? 'Odesílání…' : 'Odeslat odkaz'}
					</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>
