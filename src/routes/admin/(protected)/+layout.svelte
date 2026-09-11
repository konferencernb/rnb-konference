<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Calendar from '@lucide/svelte/icons/calendar';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import LogOut from '@lucide/svelte/icons/log-out';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Users from '@lucide/svelte/icons/users';
	import { authClient } from '$lib/auth-client';
	import Breadcrumbs from '$lib/components/admin/breadcrumbs.svelte';
	import { formatCustomerName } from '$lib/format-name';
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

	// Keyed on the route id (stable regardless of dynamic params) rather than
	// guessed from the URL — dynamic segments pull their label straight from
	// the already-loaded page data instead of showing a raw id in the trail.
	const breadcrumbItems = $derived.by((): { label: string; href?: string }[] => {
		const data = page.data as Record<string, unknown>;
		const conference = data.conference as { id: string; title: string } | undefined;
		const customer = data.customer as Parameters<typeof formatCustomerName>[0] | undefined;
		const conferenceHref = conference
			? resolve('/admin/(protected)/konference/[id]', { id: conference.id })
			: undefined;

		switch (page.route.id) {
			case '/admin/(protected)/dashboard':
				return [{ label: 'Dashboard' }];
			case '/admin/(protected)/konference':
				return [{ label: 'Konference' }];
			case '/admin/(protected)/konference/new':
				return [
					{ label: 'Konference', href: resolve('/admin/konference') },
					{ label: 'Nová konference' }
				];
			case '/admin/(protected)/konference/[id]':
				return [
					{ label: 'Konference', href: resolve('/admin/konference') },
					{ label: conference?.title ?? '', href: conferenceHref }
				];
			case '/admin/(protected)/konference/[id]/sledovat':
				return [
					{ label: 'Konference', href: resolve('/admin/konference') },
					{ label: conference?.title ?? '', href: conferenceHref },
					{ label: 'Sledovat' }
				];
			case '/admin/(protected)/konference/[id]/pristupy':
				return [
					{ label: 'Konference', href: resolve('/admin/konference') },
					{ label: conference?.title ?? '', href: conferenceHref },
					{ label: 'Přístupy' }
				];
			case '/admin/(protected)/uzivatele':
				return [{ label: 'Uživatelé' }];
			case '/admin/(protected)/uzivatele/new':
				return [
					{ label: 'Uživatelé', href: resolve('/admin/uzivatele') },
					{ label: 'Nový uživatel' }
				];
			case '/admin/(protected)/uzivatele/[id]':
				return [
					{ label: 'Uživatelé', href: resolve('/admin/uzivatele') },
					{ label: customer ? formatCustomerName(customer) : '' }
				];
			case '/admin/(protected)/logy':
				return [{ label: 'Logy přístupů' }];
			default:
				return [];
		}
	});

	async function handleSignOut() {
		await authClient.signOut();
		await goto(resolve('/admin'), { invalidateAll: true });
	}
</script>

<SidebarProvider>
	<Sidebar collapsible="icon" class="border-e-0 shadow-[2px_0_12px_-2px_rgba(0,0,0,0.08)]">
		<SidebarHeader>
			<div class="flex items-center py-1.5 group-data-[collapsible=icon]:hidden">
				<picture>
					<source srcset="/logo-rnb-full-white.svg" media="(prefers-color-scheme: dark)" />
					<img
						src="/logo-rnb-full.svg"
						alt="Rehabilitační Nemocnice Beroun & AKESO"
						class="h-9 w-auto"
						width="689"
						height="132"
					/>
				</picture>
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
									<!-- The tooltip trigger's props assume a <button> and include
									type="button", which isn't a valid attribute on <a> — drop it
									before spreading the rest onto the actual link element. -->
									<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude it from anchorProps -->
									{@const { type, ...anchorProps } = props}
									<a href={link.href} {...anchorProps}>
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
		<header class="flex items-center gap-3 border-b bg-background px-4 py-2">
			<SidebarTrigger />
			<Breadcrumbs items={breadcrumbItems} />
		</header>
		<!-- SidebarInset already renders the page's <main> landmark — a nested
		second one isn't valid HTML and confuses screen-reader navigation. -->
		<div class="flex-1 bg-muted/30">
			{@render children()}
		</div>
	</SidebarInset>
</SidebarProvider>
