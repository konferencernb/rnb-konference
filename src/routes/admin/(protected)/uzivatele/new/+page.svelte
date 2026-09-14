<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);

	// PopoverTrigger's props include onclick/onkeydown meant for a button trigger
	// (space/enter toggle the popover) — strip them so the field behaves like a
	// normal text input instead.
	function omitTriggerHandlers(props: Record<string, unknown>) {
		const rest = { ...props };
		delete rest.onclick;
		delete rest.onkeydown;
		return rest;
	}

	// Optional conferences to grant right away, same search-and-add pattern as
	// "Přidělit přístup" elsewhere — add one at a time, each shown stacked
	// below so several can be attached to the one new user.
	let confComboboxOpen = $state(false);
	let confSearchQuery = $state('');
	let selectedConferenceTitles = $state<string[]>([]);

	const availableConferencesForManual = $derived.by(() => {
		const query = confSearchQuery.trim().toLowerCase();
		return data.conferences
			.filter((c) => !selectedConferenceTitles.includes(c.title))
			.filter((c) => !query || c.title.toLowerCase().includes(query));
	});

	function addManualConference(title: string) {
		selectedConferenceTitles = [...selectedConferenceTitles, title];
		confComboboxOpen = false;
		confSearchQuery = '';
	}

	function removeManualConference(title: string) {
		selectedConferenceTitles = selectedConferenceTitles.filter((t) => t !== title);
	}
</script>

<div class="mx-auto max-w-xl px-6 py-10">
	<div>
		<h1 class="text-2xl font-bold">Nový uživatel</h1>
		<p class="mt-1 text-muted-foreground">
			Založí účet a pošle pozvánku k dokončení registrace. Konference mu můžete přidělit hned, bez
			čekání na registraci.
		</p>
	</div>

	<Card class="mt-8">
		<CardContent>
			<form
				method="POST"
				action="?/invite"
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

				<div class="flex flex-col gap-1.5">
					<Label for="conference-search">Konference (volitelné)</Label>
					<Popover bind:open={confComboboxOpen}>
						<PopoverTrigger>
							{#snippet child({ props })}
								<div class="relative">
									<Search
										class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
									/>
									<Input
										{...omitTriggerHandlers(props)}
										id="conference-search"
										type="text"
										placeholder="Hledat konferenci…"
										autocomplete="off"
										bind:value={confSearchQuery}
										onclick={() => (confComboboxOpen = true)}
										oninput={() => (confComboboxOpen = true)}
										class="cursor-pointer pl-9"
									/>
								</div>
							{/snippet}
						</PopoverTrigger>
						<PopoverContent
							class="w-(--bits-floating-anchor-width) p-1"
							onOpenAutoFocus={(event) => event.preventDefault()}
							onCloseAutoFocus={(event) => event.preventDefault()}
						>
							{#if availableConferencesForManual.length === 0}
								<p class="py-6 text-center text-sm text-muted-foreground">Nic nenalezeno.</p>
							{:else}
								<div class="max-h-72 overflow-y-auto">
									{#each availableConferencesForManual as c (c.id)}
										<button
											type="button"
											class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
											onclick={() => addManualConference(c.title)}
										>
											<CirclePlus class="size-4 shrink-0 text-primary" />
											<span class="min-w-0 flex-1 truncate">{c.title}</span>
										</button>
									{/each}
								</div>
							{/if}
						</PopoverContent>
					</Popover>
					{#if selectedConferenceTitles.length > 0}
						<div class="mt-1 flex flex-col gap-1.5">
							{#each selectedConferenceTitles as title (title)}
								<div
									class="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"
								>
									<span class="min-w-0 truncate">{title}</span>
									<button
										type="button"
										class="cursor-pointer text-muted-foreground hover:text-foreground"
										aria-label="Odebrat {title}"
										onclick={() => removeManualConference(title)}
									>
										<X class="size-4" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<input
					type="hidden"
					name="conferenceTitles"
					value={JSON.stringify(selectedConferenceTitles)}
				/>

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
