<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		error = null;

		const { error: signInError } = await authClient.signIn.email({ email, password });

		if (signInError) {
			error = 'Nesprávný e-mail nebo heslo.';
			submitting = false;
			return;
		}

		// invalidateAll so the navbar picks up the freshly created session
		// immediately — without it the root layout's `data.user` stays stale
		// (still logged-out) until the next unrelated navigation or a manual
		// reload, same reasoning as the invite-completion flow.
		await goto(resolve('/konference'), { invalidateAll: true });
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center px-6 py-16">
	<Card class="w-full max-w-sm">
		<CardContent class="flex flex-col gap-5">
			<div class="text-center">
				<h1 class="text-xl font-semibold">Přihlášení</h1>
				<p class="text-sm text-muted-foreground">
					Přihlaste se ke svému účtu pro přístup ke konferencím.
				</p>
			</div>
			<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
				<div class="flex flex-col gap-1.5">
					<Label for="email">E-mail</Label>
					<Input id="email" type="email" autocomplete="email" bind:value={email} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between">
						<Label for="password">Heslo</Label>
						<a
							href={resolve('/zapomenute-heslo')}
							class="text-xs text-muted-foreground hover:text-foreground hover:underline"
						>
							Zapomenuté heslo?
						</a>
					</div>
					<Input
						id="password"
						type="password"
						autocomplete="current-password"
						bind:value={password}
						required
					/>
				</div>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={submitting}>
					{submitting ? 'Přihlašování…' : 'Přihlásit se'}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
