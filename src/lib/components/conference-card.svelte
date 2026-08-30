<script lang="ts">
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Lock from '@lucide/svelte/icons/lock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import PlayCircle from '@lucide/svelte/icons/play-circle';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { applyAction, enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle,
		AlertDialogTrigger
	} from '$lib/components/ui/alert-dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import ConferenceStatusBadge from '$lib/components/conference-status-badge.svelte';
	import { formatPragueDate } from '$lib/prague-time';
	import { getYoutubeThumbnailUrl } from '$lib/youtube';

	type Status = 'upcoming' | 'live' | 'ended';

	let {
		conference,
		editHref,
		restoreAction
	}: {
		conference: {
			id: string;
			title: string;
			videoUrl: string | null;
			startsAt: string | Date | null;
			status: Status;
			unlocked: boolean;
		};
		editHref?: string;
		// Set on /admin/konference/delete: the card isn't a navigation link at
		// all (a deactivated conference's edit/detail pages 404 anyway) — its
		// bottom action becomes a real "Obnovit" submit button posting here,
		// and the trash icon doesn't render.
		restoreAction?: string;
	} = $props();

	let thumbnailQuality = $state<'maxresdefault' | 'hqdefault'>('maxresdefault');
	let thumbnailFailed = $state(false);
	const thumbnailUrl = $derived(getYoutubeThumbnailUrl(conference.videoUrl, thumbnailQuality));

	// AlertDialogAction doesn't auto-close the dialog (unlike Cancel) — that's
	// bits-ui's own behavior, since an "action" is expected to do something
	// first. We close it ourselves once the deactivate request succeeds.
	let deleteDialogOpen = $state(false);

	function onThumbnailLoad(event: Event) {
		// YouTube serves a 120x90 placeholder (not a real error) when maxresdefault doesn't exist
		const img = event.currentTarget as HTMLImageElement;
		if (thumbnailQuality === 'maxresdefault' && img.naturalWidth <= 120) {
			thumbnailQuality = 'hqdefault';
		}
	}

	function onThumbnailError() {
		if (thumbnailQuality === 'maxresdefault') {
			thumbnailQuality = 'hqdefault';
		} else {
			thumbnailFailed = true;
		}
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- editHref is already resolve()d by the caller -->
<div class="relative block rounded-xl transition-shadow hover:shadow-md">
	{#if !restoreAction}
		<a
			href={editHref ?? resolve('/(public)/konference/[id]', { id: conference.id })}
			class="absolute inset-0 z-0 rounded-xl"
			aria-label={conference.title}
		></a>
	{/if}

	<Card class={['h-full gap-0 overflow-hidden py-0', !restoreAction && 'pointer-events-none']}>
		<div
			class="relative aspect-video w-full bg-linear-to-br from-accent-soft via-background to-accent-soft-2"
		>
			{#if thumbnailUrl && !thumbnailFailed}
				<img
					src={thumbnailUrl}
					alt=""
					class="h-full w-full object-cover"
					onload={onThumbnailLoad}
					onerror={onThumbnailError}
				/>
			{/if}
			{#if !editHref && !conference.unlocked}
				<span
					class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur"
				>
					<Lock class="size-4" />
				</span>
			{/if}
		</div>
		<CardContent class="flex flex-1 flex-col gap-3 pt-4 pb-4">
			<div class="flex items-center justify-between gap-2">
				<span class="flex items-center gap-1.5 text-sm text-muted-foreground">
					<Calendar class="size-4" />
					{conference.startsAt ? formatPragueDate(conference.startsAt) : '—'}
				</span>
				<ConferenceStatusBadge status={conference.status} />
			</div>
			<h3 class="mt-auto text-lg font-semibold">{conference.title}</h3>
			{#if restoreAction}
				<form method="POST" action={restoreAction} use:enhance class="pointer-events-auto mt-1">
					<input type="hidden" name="conferenceId" value={conference.id} />
					<button type="submit" class={[buttonVariants(), 'w-full']}>
						<ArchiveRestore data-icon="inline-start" />
						Obnovit
					</button>
				</form>
			{:else if editHref}
				<span class={[buttonVariants({ variant: 'outline' }), 'mt-1 w-full']}>
					<Pencil data-icon="inline-start" />
					Upravit
				</span>
			{:else if conference.unlocked}
				<span class={[buttonVariants(), 'mt-1 w-full']}>
					<PlayCircle data-icon="inline-start" />
					Otevřít konferenci
				</span>
			{:else}
				<span class={[buttonVariants({ variant: 'outline' }), 'mt-1 w-full']}>
					<Lock data-icon="inline-start" />
					Získat přístup
				</span>
			{/if}
		</CardContent>
	</Card>

	{#if editHref}
		<AlertDialog bind:open={deleteDialogOpen}>
			<AlertDialogTrigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						aria-label="Smazat konferenci"
						class="absolute top-3 right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-background text-foreground opacity-50 hover:opacity-100"
					>
						<Trash2 class="size-4" />
					</button>
				{/snippet}
			</AlertDialogTrigger>
			<AlertDialogContent interactOutsideBehavior="close">
				<AlertDialogHeader>
					<AlertDialogTitle>Smazat konferenci</AlertDialogTitle>
					<AlertDialogDescription>
						Opravdu chcete smazat konferenci „{conference.title}“? Přestane se kdekoliv v aplikaci
						zobrazovat.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<form
					method="POST"
					action="?/deactivate"
					use:enhance={() => {
						return async ({ result }) => {
							await applyAction(result);

							if (result.type === 'success') {
								deleteDialogOpen = false;
								toast.success('Konference byla úspěšně smazána.');
							} else if (result.type === 'failure') {
								toast.error(
									(result.data?.deactivateError as string | undefined) ??
										'Konferenci se nepodařilo smazat.'
								);
							} else if (result.type === 'error') {
								toast.error('Něco se pokazilo. Zkuste to prosím znovu.');
							}
						};
					}}
				>
					<input type="hidden" name="conferenceId" value={conference.id} />
					<AlertDialogFooter>
						<AlertDialogCancel type="button" variant="ghost">Zrušit</AlertDialogCancel>
						<AlertDialogAction type="submit" variant="destructive">Ano</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	{/if}
</div>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
