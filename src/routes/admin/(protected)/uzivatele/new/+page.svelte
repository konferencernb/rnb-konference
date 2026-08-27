<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
</script>

<div class="mx-auto max-w-xl px-6 py-10">
	<div class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Nový uživatel</h1>
			<p class="mt-1 text-muted-foreground">
				Založí účet a pošle pozvánku k dokončení registrace. Konference mu můžete přidělit hned, bez
				čekání na registraci.
			</p>
		</div>
		<Button href={resolve('/admin/uzivatele')} variant="outline">
			<ArrowLeft data-icon="inline-start" />
			Zpět
		</Button>
	</div>

	<Card class="mt-8">
		<CardContent>
			<form
				method="POST"
				class="flex flex-col gap-4"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<div class="flex gap-3">
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="firstName">Jméno</Label>
						<Input id="firstName" name="firstName" required />
					</div>
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="lastName">Příjmení</Label>
						<Input id="lastName" name="lastName" required />
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" required />
				</div>
				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={submitting}>
					{submitting ? 'Odesílání…' : 'Odeslat pozvánku'}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
