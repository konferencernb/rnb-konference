<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		error = null;

		const { error: signUpError } = await authClient.signUp.email({
			name: `${firstName} ${lastName}`.trim(),
			firstName,
			lastName,
			email,
			password
		});

		if (signUpError) {
			error = signUpError.message ?? 'Registraci se nepodařilo dokončit.';
			submitting = false;
			return;
		}

		await goto(resolve('/konference'));
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center px-6 py-16">
	<Card class="w-full max-w-sm">
		<CardContent class="flex flex-col gap-5">
			<div class="text-center">
				<h1 class="text-xl font-semibold">Registrace</h1>
				<p class="text-sm text-muted-foreground">
					Založte si účet — po zaplacení konference vám k ní přidělíme přístup.
				</p>
			</div>
			<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
				<div class="flex gap-3">
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="firstName">Jméno</Label>
						<Input
							id="firstName"
							type="text"
							autocomplete="given-name"
							bind:value={firstName}
							required
						/>
					</div>
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="lastName">Příjmení</Label>
						<Input
							id="lastName"
							type="text"
							autocomplete="family-name"
							bind:value={lastName}
							required
						/>
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="email">E-mail</Label>
					<Input id="email" type="email" autocomplete="email" bind:value={email} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="password">Heslo</Label>
					<Input
						id="password"
						type="password"
						autocomplete="new-password"
						bind:value={password}
						required
					/>
				</div>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={submitting}>
					{submitting ? 'Zakládání účtu…' : 'Zaregistrovat se'}
				</Button>
			</form>
			<p class="text-center text-sm text-muted-foreground">
				Už máte účet? <a href={resolve('/prihlaseni')} class="text-foreground underline"
					>Přihlaste se</a
				>
			</p>
		</CardContent>
	</Card>
</div>
