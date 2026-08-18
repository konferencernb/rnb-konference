<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Copy from '@lucide/svelte/icons/copy';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import LogOut from '@lucide/svelte/icons/log-out';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { Textarea } from '$lib/components/ui/textarea';

	async function handleSignOut() {
		await authClient.signOut();
		await goto(resolve('/admin'));
	}
</script>

<header class="border-b bg-background">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
		<div class="flex items-center gap-2 font-semibold">
			<span
				class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<ShieldCheck class="size-4" />
			</span>
			Nová konference
		</div>
		<div class="flex items-center gap-2">
			<Button href={resolve('/admin/konference')} variant="outline">
				<ArrowLeft data-icon="inline-start" />
				Zpět
			</Button>
			<Button onclick={handleSignOut} variant="outline" type="button">
				<LogOut data-icon="inline-start" />
				Odhlásit
			</Button>
		</div>
	</div>
</header>

<main class="bg-muted/30">
	<div class="mx-auto max-w-6xl px-6 py-10">
		<h1 class="text-2xl font-bold">Nová konference</h1>
		<p class="mt-1 text-muted-foreground">
			Vyplňte údaje a nastavte heslo, které rozešlete účastníkům.
		</p>

		<form class="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
			<Card>
				<CardContent class="flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="title">Název konference</Label>
						<Input id="title" required />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="slug">Slug (adresa URL)</Label>
						<Input id="slug" required />
						<p class="text-xs text-muted-foreground">/konference/adresa</p>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="description">Popis</Label>
						<Textarea id="description" rows={3} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="program">Program konference</Label>
						<Textarea id="program" rows={5} />
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<Label for="youtube-live">YouTube Live URL</Label>
							<Input id="youtube-live" type="url" placeholder="https://www.youtube.com/watch?v=…" />
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="youtube-recording">YouTube záznam URL</Label>
							<Input
								id="youtube-recording"
								type="url"
								placeholder="https://www.youtube.com/watch?v=…"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<div class="flex flex-col gap-6">
				<Card>
					<CardContent class="flex flex-col gap-4">
						<div class="flex flex-col gap-1.5">
							<Label for="starts-at">Datum a čas konání</Label>
							<Input id="starts-at" type="datetime-local" />
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="status">Stav</Label>
							<NativeSelect id="status">
								<NativeSelectOption value="upcoming">Připravuje se</NativeSelectOption>
								<NativeSelectOption value="live">Živě</NativeSelectOption>
								<NativeSelectOption value="archived">Archivováno</NativeSelectOption>
							</NativeSelect>
						</div>
						<Label class="items-start">
							<Checkbox id="hidden" class="mt-0.5" />
							Skrýt konferenci (nezobrazí se veřejně)
						</Label>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="flex flex-col gap-3">
						<Label for="image">Obrázek konference</Label>
						<Button
							id="image"
							type="button"
							variant="outline"
							class="h-24 w-full border-dashed text-muted-foreground"
						>
							<ImagePlus data-icon="inline-start" />
							Nahrát obrázek
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="flex flex-col gap-3">
						<div class="flex flex-col gap-1.5">
							<Label for="password">Heslo konference</Label>
							<Input id="password" placeholder="Např. KARDIO2027" />
						</div>
						<div class="flex gap-2">
							<Button type="button" variant="outline" class="flex-1">
								<RefreshCw data-icon="inline-start" />
								Vygenerovat
							</Button>
							<Button type="button" variant="outline" class="flex-1">
								<Copy data-icon="inline-start" />
								Kopírovat
							</Button>
						</div>
						<p class="text-xs text-muted-foreground">
							Heslo se ukládá pouze jako bezpečný hash — po uložení jej již nelze zobrazit.
						</p>
					</CardContent>
				</Card>

				<Button type="submit" class="w-full">Uložit konferenci</Button>
			</div>
		</form>
	</div>
</main>
