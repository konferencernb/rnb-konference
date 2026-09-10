<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Menu from '@lucide/svelte/icons/menu';
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
	import {
		Sheet,
		SheetContent,
		SheetDescription,
		SheetHeader,
		SheetTitle,
		SheetTrigger
	} from '$lib/components/ui/sheet';

	let { user }: { user?: { email: string } } = $props();

	let mobileMenuOpen = $state(false);

	const links = [
		{ href: resolve('/'), label: 'Úvod' },
		{ href: resolve('/konference'), label: 'Konference' }
	];

	async function handleSignOut() {
		mobileMenuOpen = false;
		await authClient.signOut();
		await goto(resolve('/'), { invalidateAll: true });
	}
</script>

<header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
		<a href={resolve('/')} class="flex items-center gap-3">
			<img
				src="/nember.png"
				alt="Rehabilitační nemocnice Beroun"
				class="size-9 rounded-lg object-contain"
			/>
			<span class="flex flex-col leading-tight">
				<span class="font-semibold">Rehabilitační Nemocnice Beroun</span>
				<span class="text-xs tracking-wide text-muted-foreground uppercase">Online konference</span>
			</span>
		</a>
		<div class="hidden items-center gap-4 md:flex">
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

		<Sheet bind:open={mobileMenuOpen}>
			<SheetTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" class="md:hidden">
						<Menu class="size-5" />
						<span class="sr-only">Otevřít menu</span>
					</Button>
				{/snippet}
			</SheetTrigger>
			<SheetContent class="flex flex-col gap-0 px-0">
				<SheetHeader class="border-b px-6 pb-4">
					<SheetTitle class="flex items-center gap-3 text-left">
						<img
							src="/nember.png"
							alt="Rehabilitační nemocnice Beroun"
							class="size-9 rounded-lg object-contain"
						/>
						<span class="flex flex-col leading-tight font-normal">
							<span class="font-semibold">Rehabilitační Nemocnice Beroun</span>
							<span class="text-xs tracking-wide text-muted-foreground uppercase">
								Online konference
							</span>
						</span>
					</SheetTitle>
					<SheetDescription class="sr-only">Navigační menu</SheetDescription>
				</SheetHeader>

				<nav class="flex flex-col gap-1 px-4 py-4">
					{#each links as link (link.href)}
						<Button
							href={link.href}
							variant={page.url.pathname === link.href ? 'secondary' : 'ghost'}
							class="justify-start"
							onclick={() => (mobileMenuOpen = false)}
						>
							{link.label}
						</Button>
					{/each}
				</nav>

				<div class="mt-auto border-t px-4 py-4">
					{#if user}
						<div class="flex items-center gap-3 rounded-lg bg-muted p-3">
							<Avatar size="lg">
								<AvatarFallback>
									<UserRound class="size-4" />
								</AvatarFallback>
							</Avatar>
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{user.email}</span>
						</div>
						<Button variant="outline" class="mt-3 w-full" onclick={handleSignOut}>
							<LogOut data-icon="inline-start" />
							Odhlásit se
						</Button>
					{:else}
						<Button
							href={resolve('/prihlaseni')}
							class="w-full"
							onclick={() => (mobileMenuOpen = false)}
						>
							Přihlásit se
						</Button>
					{/if}
				</div>
			</SheetContent>
		</Sheet>
	</div>
</header>
