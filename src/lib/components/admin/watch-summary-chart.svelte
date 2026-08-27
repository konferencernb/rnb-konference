<script lang="ts">
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';

	let { data }: { data: { id: string; title: string; watched: number; expected: number }[] } =
		$props();

	let containerWidth = $state(600);
	const height = 220;
	const padding = { top: 16, right: 12, bottom: 28, left: 28 };

	const maxValue = $derived(Math.max(1, ...data.flatMap((d) => [d.watched, d.expected])));
	const yMax = $derived.by(() => {
		const raw = maxValue;
		if (raw <= 5) return raw + 1;
		const step = 10 ** (Math.floor(Math.log10(raw)) - 1) * (raw > 50 ? 5 : 1);
		return Math.ceil(raw / step) * step;
	});

	const yTicks = $derived.by(() => {
		const stepCount = 4;
		const raw = Array.from({ length: stepCount + 1 }, (_, i) => Math.round((yMax / stepCount) * i));
		return raw.filter((value, i) => i === 0 || value !== raw[i - 1]);
	});

	function yFor(value: number) {
		const usableHeight = height - padding.top - padding.bottom;
		return padding.top + usableHeight - (value / yMax) * usableHeight;
	}

	function truncateTitle(title: string) {
		return title.length > 12 ? `${title.slice(0, 11)}…` : title;
	}

	const groups = $derived.by(() => {
		const usableWidth = containerWidth - padding.left - padding.right;
		const groupWidth = data.length ? usableWidth / data.length : 0;
		const barGap = 3;
		const barWidth = Math.max(6, Math.min(28, (groupWidth - barGap - 8) / 2));

		return data.map((d, i) => {
			const groupCenter = padding.left + groupWidth * (i + 0.5);
			return {
				...d,
				x: groupCenter,
				watchedX: groupCenter - barGap / 2 - barWidth,
				expectedX: groupCenter + barGap / 2,
				barWidth,
				watchedY: yFor(d.watched),
				expectedY: yFor(d.expected)
			};
		});
	});

	let hoverId = $state<string | null>(null);
	const hovered = $derived(groups.find((g) => g.id === hoverId) ?? null);
</script>

{#if data.length === 0}
	<Empty class="border border-dashed bg-card">
		<EmptyDescription>Zatím nejsou žádné konference se záznamy o sledování.</EmptyDescription>
	</Empty>
{:else}
	<div class="flex items-center gap-4">
		<span class="flex items-center gap-1.5 text-xs text-muted-foreground">
			<span class="size-2 rounded-full bg-primary"></span>
			Sledovalo
		</span>
		<span class="flex items-center gap-1.5 text-xs text-muted-foreground">
			<span class="size-2 rounded-full bg-muted-foreground/40"></span>
			Mělo přístup
		</span>
	</div>
	<div bind:clientWidth={containerWidth} class="relative mt-2 w-full">
		<svg width={containerWidth} {height} role="img" aria-label="Sledovanost konferencí">
			<!-- gridlines -->
			{#each yTicks as tick, i (i)}
				<line
					x1={padding.left}
					x2={containerWidth - padding.right}
					y1={yFor(tick)}
					y2={yFor(tick)}
					stroke="var(--border)"
					stroke-width="1"
				/>
				<text
					x={padding.left - 8}
					y={yFor(tick)}
					text-anchor="end"
					dominant-baseline="middle"
					class="fill-muted-foreground text-[10px]"
				>
					{tick}
				</text>
			{/each}

			<!-- bars -->
			{#each groups as group (group.id)}
				<g
					class="cursor-default"
					role="img"
					aria-label="{group.title}: sledovalo {group.watched}, mělo přístup {group.expected}"
					onpointerenter={() => (hoverId = group.id)}
					onpointerleave={() => (hoverId = null)}
				>
					<rect
						x={group.watchedX}
						y={group.watchedY}
						width={group.barWidth}
						height={Math.max(0, yFor(0) - group.watchedY)}
						rx="3"
						fill="var(--primary)"
						opacity={hoverId === null || hoverId === group.id ? 1 : 0.4}
					/>
					<rect
						x={group.expectedX}
						y={group.expectedY}
						width={group.barWidth}
						height={Math.max(0, yFor(0) - group.expectedY)}
						rx="3"
						fill="var(--muted-foreground)"
						opacity={hoverId === null || hoverId === group.id ? 0.4 : 0.15}
					/>
					<!-- invisible full-height hit target so hover isn't limited to the thin bars -->
					<rect
						x={group.x - (containerWidth - padding.left - padding.right) / data.length / 2}
						y={padding.top}
						width={(containerWidth - padding.left - padding.right) / data.length}
						height={height - padding.top - padding.bottom}
						fill="transparent"
					/>
					<text
						x={group.x}
						y={height - padding.bottom + 16}
						text-anchor="middle"
						class="fill-muted-foreground text-[10px]"
					>
						{truncateTitle(group.title)}
					</text>
				</g>
			{/each}
		</svg>

		{#if hovered}
			<div
				class="pointer-events-none absolute top-2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
				style:left="{Math.min(Math.max(hovered.x, 70), containerWidth - 70)}px"
				style:transform="translateX(-50%)"
			>
				<p class="font-semibold text-popover-foreground">{hovered.title}</p>
				<p class="text-muted-foreground">Sledovalo: {hovered.watched}</p>
				<p class="text-muted-foreground">Mělo přístup: {hovered.expected}</p>
			</div>
		{/if}
	</div>
{/if}
