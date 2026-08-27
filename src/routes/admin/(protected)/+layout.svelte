<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Calendar from '@lucide/svelte/icons/calendar';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import LogOut from '@lucide/svelte/icons/log-out';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Users from '@lucide/svelte/icons/users';
	import { authClient } from '$lib/auth-client';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarHeader,
		SidebarInset,
		SidebarMenu,
		SidebarMenuButton,
		SidebarMenuItem,
		SidebarProvider,
		SidebarTrigger
	} from '$lib/components/ui/sidebar';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const links = [
		{ href: resolve('/admin/dashboard'), label: 'Dashboard', icon: LayoutDashboard },
		{ href: resolve('/admin/konference'), label: 'Konference', icon: Calendar },
		{ href: resolve('/admin/uzivatele'), label: 'Uživatelé', icon: Users },
		{ href: resolve('/admin/logy'), label: 'Logy', icon: ScrollText }
	];

	async function handleSignOut() {
		await authClient.signOut();
		await goto(resolve('/admin'), { invalidateAll: true });
	}
</script>

<SidebarProvider>
	<Sidebar collapsible="icon" class="border-e-0 shadow-[2px_0_12px_-2px_rgba(0,0,0,0.08)]">
		<SidebarHeader>
			<div class="flex items-center gap-2 py-1.5">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
				>
					<ShieldCheck class="size-4" />
				</span>
				<span class="text-sm font-semibold group-data-[collapsible=icon]:hidden">
					Administrace
				</span>
			</div>
		</SidebarHeader>
		<SidebarContent>
			<SidebarGroup>
				<SidebarMenu>
					{#each links as link (link.href)}
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={page.url.pathname === link.href ||
									page.url.pathname.startsWith(link.href + '/')}
								tooltipContent={link.label}
								class="data-active:bg-primary/10 data-active:text-primary data-active:hover:bg-primary/15 data-active:hover:text-primary"
							>
								{#snippet child({ props })}
									<a href={link.href} {...props}>
										<link.icon />
										<span>{link.label}</span>
									</a>
								{/snippet}
							</SidebarMenuButton>
						</SidebarMenuItem>
					{/each}
				</SidebarMenu>
			</SidebarGroup>
		</SidebarContent>
		<SidebarFooter>
			<DropdownMenu>
				<DropdownMenuTrigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left hover:bg-sidebar-accent"
						>
							<Avatar size="sm">
								<AvatarFallback>
									<UserRound class="size-4" />
								</AvatarFallback>
							</Avatar>
							<span class="truncate text-sm group-data-[collapsible=icon]:hidden">
								{data.user?.email}
							</span>
						</button>
					{/snippet}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" side="top">
					<DropdownMenuItem onSelect={handleSignOut}>
						<LogOut data-icon="inline-start" />
						Odhlásit se
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarFooter>
	</Sidebar>
	<SidebarInset>
		<header class="flex items-center gap-2 border-b bg-background px-4 py-2">
			<SidebarTrigger />
		</header>
		<main class="flex-1 bg-muted/30">
			{@render children()}
		</main>
	</SidebarInset>
</SidebarProvider>
