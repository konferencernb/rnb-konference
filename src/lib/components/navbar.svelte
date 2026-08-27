<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Activity from '@lucide/svelte/icons/activity';
	import LogOut from '@lucide/svelte/icons/log-out';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { authClient } from '$lib/auth-client';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';

	let { user }: { user?: { email: string } } = $props();

	const links = [
		{ href: resolve('/'), label: 'Úvod' },
		{ href: resolve('/konference'), label: 'Konference' }
	];

	async function handleSignOut() {
		await authClient.signOut();
		await goto(resolve('/'), { invalidateAll: true });
	}
</script>

<header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
		<a href={resolve('/')} class="flex items-center gap-3">
			<span
				class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<Activity class="size-5" />
			</span>
			<span class="flex flex-col leading-tight">
				<span class="font-semibold">Nemocnice Beroun</span>
				<span class="text-xs tracking-wide text-muted-foreground uppercase">Online konference</span>
			</span>
		</a>
		<div class="flex items-center gap-4">
			<nav class="flex items-center gap-1">
				{#each links as link (link.href)}
					<Button
						href={link.href}
						variant={page.url.pathname === link.href ? 'secondary' : 'ghost'}
					>
						{link.label}
					</Button>
				{/each}
			</nav>
			{#if user}
				<DropdownMenu>
					<DropdownMenuTrigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="ml-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted"
							>
								<Avatar size="lg">
									<AvatarFallback>
										<UserRound class="size-4" />
									</AvatarFallback>
								</Avatar>
								<span class="text-sm font-medium">{user.email}</span>
							</button>
						{/snippet}
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={handleSignOut}>
							<LogOut data-icon="inline-start" />
							Odhlásit se
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			{:else}
				<Button href={resolve('/prihlaseni')}>Přihlásit se</Button>
			{/if}
		</div>
	</div>
</header>
