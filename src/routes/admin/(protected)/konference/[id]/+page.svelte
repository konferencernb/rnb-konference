<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { applyAction, enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import RichTextEditor from '$lib/components/rich-text-editor.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
	let description = $state(data.conference.description ?? '');
	let status = $state(data.conference.status);

	function toDatetimeLocal(value: string | Date | null) {
		if (!value) return '';
		const date = new Date(value);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}
</script>

<form
	method="POST"
	action="?/update"
	class="grid gap-6 lg:grid-cols-[2fr_1fr]"
	use:enhance={() => {
		submitting = true;
		return async ({ result }) => {
			await applyAction(result);
			submitting = false;

			if (result.type === 'success') {
				toast.success('Změny byly úspěšně uloženy.');
			} else if (result.type === 'failure') {
				toast.error((result.data?.error as string | undefined) ?? 'Změny se nepodařilo uložit.');
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
				<Input id="title" name="title" value={data.conference.title} required />
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="videoUrl">YouTube URL</Label>
				<Input
					id="videoUrl"
					name="videoUrl"
					type="url"
					value={data.conference.videoUrl}
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
					<Input
						id="price"
						name="price"
						type="number"
						min="0"
						step="1"
						value={data.conference.price}
						required
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="startsAt">Datum a čas konání</Label>
					<Input
						id="startsAt"
						name="startsAt"
						type="datetime-local"
						value={toDatetimeLocal(data.conference.startsAt)}
					/>
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
			{submitting ? 'Ukládání…' : 'Uložit změny'}
		</Button>
	</div>
</form>
