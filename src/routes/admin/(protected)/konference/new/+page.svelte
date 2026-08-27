<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
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
	<div class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Nová konference</h1>
			<p class="mt-1 text-muted-foreground">
				Vyplňte údaje o konferenci. Přístup zákazníkům přidělíte po zaplacení zvlášť.
			</p>
		</div>
		<Button href={resolve('/admin/konference')} variant="outline">
			<ArrowLeft data-icon="inline-start" />
			Zpět
		</Button>
	</div>

	<form
		method="POST"
		class="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
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
