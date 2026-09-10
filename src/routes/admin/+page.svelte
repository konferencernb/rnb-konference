<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
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

		await goto(resolve('/admin/konference'));
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-linear-to-b from-muted/40 to-background px-6"
>
	<Card class="w-full max-w-sm">
		<CardContent class="flex flex-col gap-5">
			<span
				class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<ShieldCheck class="size-5" />
			</span>
			<div>
				<h1 class="text-xl font-semibold">Administrace</h1>
				<p class="text-sm text-muted-foreground">
					Přihlaste se pro správu online konferencí Nemocnice Beroun.
				</p>
			</div>
			<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
				<div class="flex flex-col gap-1.5">
					<Label for="email">E-mail</Label>
					<Input id="email" type="email" autocomplete="email" bind:value={email} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="password">Heslo</Label>
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
			<a
				href={resolve('/')}
				class="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
			>
				<ArrowLeft class="size-4" />
				Zpět na web
			</a>
		</CardContent>
	</Card>
</div>
