<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import { resolve } from '$app/paths';
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
					return async ({ result }) => {
						if (result.type === 'redirect') {
							toast.success('Pozvánka byla úspěšně odeslána.');
							// eslint-disable-next-line svelte/no-navigation-without-resolve -- result.location is already a server-resolved path, not a route id
							await goto(result.location, { invalidateAll: true });
							return;
						}

						await applyAction(result);
						submitting = false;

						if (result.type === 'failure') {
							toast.error(
								(result.data?.error as string | undefined) ?? 'Pozvánku se nepodařilo odeslat.'
							);
						} else if (result.type === 'error') {
							toast.error('Něco se pokazilo. Zkuste to prosím znovu.');
						}
					};
				}}
			>
				<div class="flex gap-3">
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="firstName">Jméno <span class="text-destructive">*</span></Label>
						<Input id="firstName" name="firstName" required />
					</div>
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="lastName">Příjmení <span class="text-destructive">*</span></Label>
						<Input id="lastName" name="lastName" required />
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="email">Email <span class="text-destructive">*</span></Label>
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
