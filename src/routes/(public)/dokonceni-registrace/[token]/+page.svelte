<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { validatePassword } from '$lib/password';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

		const response = await fetch('/api/dokonceni-registrace', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: page.params.token, password })
		});

		if (!response.ok) {
			const body = await response.json().catch(() => null);
			const message: string = body?.message ?? 'Registraci se nepodařilo dokončit.';
			error = message;
			submitting = false;
			toast.error(message);
			return;
		}

		const { email } = await response.json();
		await authClient.signIn.email({ email, password });
		toast.success('Registrace byla úspěšně dokončena.');
		// invalidateAll so the navbar picks up the freshly created session
		// immediately — without it the layout's `data.user` stays stale (still
		// logged-out) until the next unrelated navigation or a manual reload.
		await goto(resolve('/konference'), { invalidateAll: true });
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center px-6 py-16">
	<Card class="w-full max-w-sm">
		<CardContent class="flex flex-col gap-5">
			{#if data.status === 'invalid'}
				<div class="text-center">
					<h1 class="text-xl font-semibold">Odkaz je neplatný</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Zkontrolujte prosím, že jste odkaz zkopírovali celý, nebo si vyžádejte novou pozvánku.
					</p>
				</div>
			{:else if data.status === 'expired'}
				<div class="text-center">
					<h1 class="text-xl font-semibold">Platnost odkazu vypršela</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Ozvěte se nám prosím a pošleme vám novou pozvánku.
					</p>
				</div>
			{:else}
				<div class="text-center">
					<h1 class="text-xl font-semibold">
						{data.firstName ? `Vítejte, ${data.firstName}` : 'Dokončení registrace'}
					</h1>
					<p class="text-sm text-muted-foreground">
						Nastavte si heslo a dokončete registraci účtu {data.email}.
					</p>
				</div>
				<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
					<div class="flex flex-col gap-1.5">
						<Label for="password">Heslo</Label>
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
						{submitting ? 'Dokončování…' : 'Dokončit registraci'}
					</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>
