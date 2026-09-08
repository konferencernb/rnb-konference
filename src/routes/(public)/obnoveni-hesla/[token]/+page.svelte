<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { validatePassword } from '$lib/password';

	let password = $state('');
	let passwordConfirm = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;

		const passwordError = validatePassword(password);
		if (passwordError) {
			error = passwordError;
			return;
		}
		if (password !== passwordConfirm) {
			error = 'Hesla se neshodují.';
			return;
		}

		submitting = true;

		const response = await fetch('/api/obnoveni-hesla', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: page.params.token, password })
		});

		if (!response.ok) {
			const body = await response.json().catch(() => null);
			const message: string = body?.message ?? 'Heslo se nepodařilo změnit.';
			error = message;
			submitting = false;
			toast.error(message);
			return;
		}

		toast.success('Heslo bylo úspěšně změněno. Přihlaste se prosím novým heslem.');
		await goto(resolve('/prihlaseni'));
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center px-6 py-16">
	<Card class="w-full max-w-sm">
		<CardContent class="flex flex-col gap-5">
			<div class="text-center">
				<h1 class="text-xl font-semibold">Nastavit nové heslo</h1>
				<p class="text-sm text-muted-foreground">Zvolte si nové heslo ke svému účtu.</p>
			</div>
			<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
				<div class="flex flex-col gap-1.5">
					<Label for="password">Nové heslo</Label>
					<Input
						id="password"
						type="password"
						autocomplete="new-password"
						bind:value={password}
						required
					/>
					<p class="text-xs text-muted-foreground">
						Alespoň 8 znaků, velké písmeno, číslice a speciální znak.
					</p>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="passwordConfirm">Heslo znovu</Label>
					<Input
						id="passwordConfirm"
						type="password"
						autocomplete="new-password"
						bind:value={passwordConfirm}
						required
					/>
				</div>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={submitting}>
					{submitting ? 'Ukládání…' : 'Nastavit heslo'}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
