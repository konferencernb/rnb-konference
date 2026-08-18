<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Calendar from '@lucide/svelte/icons/calendar';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Users from '@lucide/svelte/icons/users';
	import { authClient } from '$lib/auth-client';
	import StatCard from '$lib/components/admin/stat-card.svelte';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { type Conference, conferences } from '$lib/data/conferences';

	const accessLog: {
		time: string;
		conference: string;
		ip: string;
		device: string;
		result: string;
	}[] = [];

	const statusLabel: Record<Conference['status'], string> = {
		live: 'Živě',
		upcoming: 'Připravuje se',
		archived: 'Archivováno'
	};

	const statusVariant: Record<Conference['status'], BadgeVariant> = {
		live: 'destructive',
		upcoming: 'secondary',
		archived: 'outline'
	};

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
			Administrace konferencí
		</div>
		<div class="flex items-center gap-2">
			<Button href={resolve('/admin/konference/new')}>
				<Plus data-icon="inline-start" />
				Nová konference
			</Button>
			<Button onclick={handleSignOut} variant="outline" type="button">
				<LogOut data-icon="inline-start" />
				Odhlásit
			</Button>
		</div>
	</div>
</header>

<main class="bg-muted/30">
	<div class="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
		<section>
			<h2 class="mb-4 text-lg font-semibold">Přehled</h2>
			<div class="grid gap-4 sm:grid-cols-3">
				<StatCard icon={Calendar} label="Konferencí celkem" value={conferences.length} />
				<StatCard icon={Users} label="Úspěšných přístupů" value={0} />
				<StatCard icon={EyeOff} label="Neúspěšných pokusů" value={0} />
			</div>
		</section>

		<section>
			<h2 class="mb-4 text-lg font-semibold">Konference</h2>
			{#if conferences.length === 0}
				<Empty class="border border-dashed bg-card">
					<EmptyDescription>
						Zatím nemáte žádné konference. Vytvořte první pomocí tlačítka „Nová konference“.
					</EmptyDescription>
				</Empty>
			{:else}
				<Card class="overflow-hidden py-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Název</TableHead>
								<TableHead>Datum</TableHead>
								<TableHead>Stav</TableHead>
								<TableHead class="text-right">Akce</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each conferences as conference (conference.slug)}
								<TableRow>
									<TableCell class="font-medium">{conference.title}</TableCell>
									<TableCell>{conference.date}</TableCell>
									<TableCell>
										<Badge variant={statusVariant[conference.status]}>
											{statusLabel[conference.status]}
										</Badge>
									</TableCell>
									<TableCell class="text-right">
										<Button variant="outline" size="sm">
											<Pencil data-icon="inline-start" />
											Upravit
										</Button>
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</Card>
			{/if}
		</section>

		<section>
			<h2 class="mb-4 text-lg font-semibold">Poslední přístupy</h2>
			<Card class="overflow-hidden py-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Čas</TableHead>
							<TableHead>Konference</TableHead>
							<TableHead>IP adresa</TableHead>
							<TableHead>Zařízení</TableHead>
							<TableHead>Výsledek</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#if accessLog.length === 0}
							<TableRow>
								<TableCell colspan={5} class="py-8 text-center text-muted-foreground">
									Zatím nejsou žádné záznamy o přístupech.
								</TableCell>
							</TableRow>
						{:else}
							{#each accessLog as entry (entry.time)}
								<TableRow>
									<TableCell>{entry.time}</TableCell>
									<TableCell>{entry.conference}</TableCell>
									<TableCell>{entry.ip}</TableCell>
									<TableCell>{entry.device}</TableCell>
									<TableCell>{entry.result}</TableCell>
								</TableRow>
							{/each}
						{/if}
					</TableBody>
				</Table>
			</Card>
		</section>
	</div>
</main>
