<script lang="ts">
	import { untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Highlight from '@tiptap/extension-highlight';
	import Subscript from '@tiptap/extension-subscript';
	import Superscript from '@tiptap/extension-superscript';
	import Bold from '@lucide/svelte/icons/bold';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Code from '@lucide/svelte/icons/code';
	import Heading from '@lucide/svelte/icons/heading';
	import Highlighter from '@lucide/svelte/icons/highlighter';
	import Italic from '@lucide/svelte/icons/italic';
	import Link from '@lucide/svelte/icons/link';
	import Quote from '@lucide/svelte/icons/quote';
	import Redo from '@lucide/svelte/icons/redo-2';
	import Strikethrough from '@lucide/svelte/icons/strikethrough';
	import SubscriptIcon from '@lucide/svelte/icons/subscript';
	import SuperscriptIcon from '@lucide/svelte/icons/superscript';
	import Underline from '@lucide/svelte/icons/underline';
	import Undo from '@lucide/svelte/icons/undo-2';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Toggle } from '$lib/components/ui/toggle';
	import { cn } from '$lib/utils.js';

	let {
		name,
		id,
		value = $bindable(''),
		placeholder
	}: { name: string; id?: string; value?: string; placeholder?: string } = $props();

	let element = $state<HTMLDivElement>();
	let editor = $state<Editor>();
	let transactionCount = $state(0);
	let linkPopoverOpen = $state(false);
	let linkUrlDraft = $state('');

	// Toolbar buttons run their command on mousedown (with preventDefault) instead
	// of relying on click: a plain click first lets the browser blur the
	// contenteditable, which can drop the editor's current selection before the
	// click handler ever runs — the command then needs a second press to "take".
	// Preventing default on mousedown keeps focus (and the selection) on the
	// editor the whole time.
	function preventFocusLoss(event: MouseEvent) {
		event.preventDefault();
	}

	// editor.isActive()/can() read tiptap's internal (non-Svelte) state, so Svelte
	// has no way to know when to re-evaluate them on its own. transactionCount is
	// bumped on every editor transaction and read here so this derived recomputes
	// each time — without rebuilding the toolbar's DOM (a `{#key}` block would
	// tear down and recreate every button on each keystroke, which drops focus
	// from the content editable and eats characters as you type).
	const toolbar = $derived.by(() => {
		const e = editor;
		if (!e) {
			return {
				canUndo: false,
				canRedo: false,
				blockquote: false,
				bold: false,
				italic: false,
				strike: false,
				code: false,
				underline: false,
				highlight: false,
				link: false,
				superscript: false,
				subscript: false,
				transactionCount
			};
		}
		return {
			canUndo: e.can().undo(),
			canRedo: e.can().redo(),
			blockquote: e.isActive('blockquote'),
			bold: e.isActive('bold'),
			italic: e.isActive('italic'),
			strike: e.isActive('strike'),
			code: e.isActive('code'),
			underline: e.isActive('underline'),
			highlight: e.isActive('highlight'),
			link: e.isActive('link'),
			superscript: e.isActive('superscript'),
			subscript: e.isActive('subscript'),
			transactionCount
		};
	});

	$effect(() => {
		if (!element) return;

		const instance = new Editor({
			element,
			extensions: [
				StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
				Highlight,
				Superscript,
				Subscript
			],
			content: untrack(() => value),
			editorProps: {
				attributes: { class: 'rich-text min-h-24 px-3 py-2 outline-none' }
			},
			onUpdate: ({ editor: e }) => {
				value = e.getHTML();
				transactionCount++;
			},
			onTransaction: () => {
				transactionCount++;
			}
		});

		editor = instance;

		return () => {
			instance.destroy();
			editor = undefined;
		};
	});

	function openLinkPopover() {
		linkUrlDraft = editor?.getAttributes('link').href ?? '';
		linkPopoverOpen = true;
	}

	function applyLink() {
		const url = linkUrlDraft.trim();
		if (!url) {
			editor?.chain().focus().unsetLink().run();
		} else {
			editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
		}
		linkPopoverOpen = false;
	}

	function removeLink() {
		editor?.chain().focus().unsetLink().run();
		linkPopoverOpen = false;
	}

	const toolbarTriggerClass =
		'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center gap-0.5 rounded-lg text-sm transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground';
</script>

<div class="rounded-lg border border-input">
	<div class="flex flex-wrap items-center gap-1 border-b border-input p-1">
		{#if editor}
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={!toolbar.canUndo}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().undo().run()}
				aria-label="Zpět"
			>
				<Undo class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={!toolbar.canRedo}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().redo().run()}
				aria-label="Znovu"
			>
				<Redo class="size-4" />
			</Button>

			<div class="mx-0.5 h-5 w-px bg-border"></div>

			<DropdownMenu>
				<DropdownMenuTrigger>
					{#snippet child({ props })}
						<button
							type="button"
							{...props}
							onmousedown={preventFocusLoss}
							class={cn(toolbarTriggerClass, 'w-auto px-1.5')}
							aria-label="Nadpis"
						>
							<Heading class="size-4" />
							<ChevronDown class="size-3" />
						</button>
					{/snippet}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onSelect={() => editor?.chain().focus().setParagraph().run()}>
						Normální text
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
					>
						Nadpis 1
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
					>
						Nadpis 2
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
					>
						Nadpis 3
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Toggle
				size="sm"
				pressed={toolbar.blockquote}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleBlockquote().run()}
				aria-label="Citace"
			>
				<Quote class="size-4" />
			</Toggle>

			<div class="mx-0.5 h-5 w-px bg-border"></div>

			<Toggle
				size="sm"
				pressed={toolbar.bold}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleBold().run()}
				aria-label="Tučně"
			>
				<Bold class="size-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={toolbar.italic}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleItalic().run()}
				aria-label="Kurzíva"
			>
				<Italic class="size-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={toolbar.strike}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleStrike().run()}
				aria-label="Přeškrtnuté"
			>
				<Strikethrough class="size-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={toolbar.code}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleCode().run()}
				aria-label="Kód"
			>
				<Code class="size-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={toolbar.underline}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleUnderline().run()}
				aria-label="Podtržené"
			>
				<Underline class="size-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={toolbar.highlight}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleHighlight().run()}
				aria-label="Zvýraznění"
			>
				<Highlighter class="size-4" />
			</Toggle>

			<Popover
				bind:open={linkPopoverOpen}
				onOpenChange={(open) => {
					if (open) openLinkPopover();
				}}
			>
				<PopoverTrigger>
					{#snippet child({ props })}
						<button
							type="button"
							{...props}
							onmousedown={preventFocusLoss}
							class={cn(toolbarTriggerClass, toolbar.link && 'bg-muted text-foreground')}
							aria-label="Odkaz"
						>
							<Link class="size-4" />
						</button>
					{/snippet}
				</PopoverTrigger>
				<PopoverContent class="w-72 p-2" onCloseAutoFocus={(event) => event.preventDefault()}>
					<div class="flex items-center gap-1.5">
						<Input
							bind:value={linkUrlDraft}
							placeholder="https://…"
							onkeydown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									applyLink();
								}
							}}
						/>
						<Button size="sm" onclick={applyLink}>Použít</Button>
					</div>
					{#if toolbar.link}
						<button
							type="button"
							class="mt-1.5 cursor-pointer text-xs text-destructive hover:underline"
							onclick={removeLink}
						>
							Odebrat odkaz
						</button>
					{/if}
				</PopoverContent>
			</Popover>

			<div class="mx-0.5 h-5 w-px bg-border"></div>

			<Toggle
				size="sm"
				pressed={toolbar.superscript}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleSuperscript().run()}
				aria-label="Horní index"
			>
				<SuperscriptIcon class="size-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={toolbar.subscript}
				onmousedown={preventFocusLoss}
				onclick={() => editor?.chain().focus().toggleSubscript().run()}
				aria-label="Dolní index"
			>
				<SubscriptIcon class="size-4" />
			</Toggle>
		{/if}
	</div>
	<div bind:this={element} {id} data-placeholder={placeholder}></div>
</div>
<input type="hidden" {name} {value} />
