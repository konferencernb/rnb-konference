<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import RichTextEditor from '$lib/components/rich-text-editor.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
	let description = $state('');
	let status = $state('upcoming');
</script>

<div class="mx-auto max-w-6xl px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Nová konference</h1>
		<p class="mt-1 text-muted-foreground">
			Vyplňte údaje o konferenci. Přístup zákazníkům přidělíte po zaplacení zvlášť.
		</p>
	</div>

	<form
		method="POST"
		class="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]"
		use:enhance={() => {
			submitting = true;
			return async ({ result }) => {
				if (result.type === 'redirect') {
					toast.success('Konference byla úspěšně vytvořena.');
					// eslint-disable-next-line svelte/no-navigation-without-resolve -- result.location is already a server-resolved path, not a route id
					await goto(result.location, { invalidateAll: true });
					return;
				}

				await applyAction(result);
				submitting = false;

				if (result.type === 'failure') {
					toast.error(
						(result.data?.error as string | undefined) ?? 'Konferenci se nepodařilo vytvořit.'
					);
				} else if (result.type === 'error') {
					toast.error('Něco se pokazilo. Zkuste to prosím znovu.');
				}
			};
		}}
	>
		<Card>
			<CardContent class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="title">Název konference</Label>
					<Input id="title" name="title" required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="videoUrl">YouTube URL</Label>
					<Input
						id="videoUrl"
						name="videoUrl"
						type="url"
						placeholder="https://www.youtube.com/watch?v=…"
						required={status !== 'upcoming'}
					/>
					<p class="text-xs text-muted-foreground">
						{status === 'upcoming'
							? 'Volitelné, dokud se konference připravuje — doplníte, až bude stream připravený.'
							: 'Stejná URL slouží pro živý přenos i pozdější záznam.'}
					</p>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="description">Popis</Label>
					<RichTextEditor id="description" name="description" bind:value={description} />
				</div>
			</CardContent>
		</Card>

		<div class="flex flex-col gap-6">
			<Card>
				<CardContent class="flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="price">Cena (Kč)</Label>
						<Input id="price" name="price" type="number" min="0" step="1" required />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="startsAt">Datum a čas konání</Label>
						<Input id="startsAt" name="startsAt" type="datetime-local" />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="status">Stav</Label>
						<NativeSelect id="status" name="status" bind:value={status} class="w-full">
							<NativeSelectOption value="upcoming">Připravuje se</NativeSelectOption>
							<NativeSelectOption value="live">Živě</NativeSelectOption>
							<NativeSelectOption value="ended">Ukončeno</NativeSelectOption>
						</NativeSelect>
					</div>
				</CardContent>
			</Card>

			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}

			<Button type="submit" class="w-full" disabled={submitting}>
				{submitting ? 'Ukládání…' : 'Uložit konferenci'}
			</Button>
		</div>
	</form>
</div>
