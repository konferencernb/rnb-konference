<script lang="ts">
	import { Empty, EmptyDescription } from '$lib/components/ui/empty';

	let { data }: { data: { bucket: Date; viewers: number }[] } = $props();

	let containerWidth = $state(600);
	const height = 220;
	const padding = { top: 16, right: 12, bottom: 28, left: 28 };

	const maxViewers = $derived(Math.max(1, ...data.map((d) => d.viewers)));
	// Round the axis ceiling up to a clean step so the top tick reads as a
	// round number rather than the raw max.
	const yMax = $derived.by(() => {
		const raw = maxViewers;
		if (raw <= 5) return raw + 1;
		const step = 10 ** (Math.floor(Math.log10(raw)) - 1) * (raw > 50 ? 5 : 1);
		return Math.ceil(raw / step) * step;
	});

	const minTime = $derived(data.length ? data[0].bucket.getTime() : 0);
	const maxTime = $derived(data.length ? data[data.length - 1].bucket.getTime() : 1);
	const timeSpan = $derived(Math.max(1, maxTime - minTime));

	function xFor(time: number) {
		const usableWidth = containerWidth - padding.left - padding.right;
		return padding.left + ((time - minTime) / timeSpan) * usableWidth;
	}

	function yFor(viewers: number) {
		const usableHeight = height - padding.top - padding.bottom;
		return padding.top + usableHeight - (viewers / yMax) * usableHeight;
	}

	const points = $derived(
		data.map((d) => ({ x: xFor(d.bucket.getTime()), y: yFor(d.viewers), d }))
	);

	const linePath = $derived(points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '));
	const areaPath = $derived(
		points.length
			? `${linePath} L ${points[points.length - 1].x} ${yFor(0)} L ${points[0].x} ${yFor(0)} Z`
			: ''
	);

	const yTicks = $derived.by(() => {
		const stepCount = 4;
		const raw = Array.from({ length: stepCount + 1 }, (_, i) => Math.round((yMax / stepCount) * i));
		// yMax can be small enough that adjacent steps round to the same
		// integer (e.g. yMax=2 → 0, 1, 1, 2, 2) — drop the repeats so the
		// axis never shows the same label twice.
		return raw.filter((value, i) => i === 0 || value !== raw[i - 1]);
	});

	function formatViewerNoun(count: number) {
		if (count === 1) return 'divák';
		if (count >= 2 && count <= 4) return 'diváci';
		return 'diváků';
	}

	function formatTime(time: number) {
		return new Date(time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
	}

	const xTickTimes = $derived.by(() => {
		if (!data.length) return [];
		const count = Math.min(data.length, 6);
		return Array.from({ length: count }, (_, i) => minTime + (timeSpan * i) / (count - 1 || 1));
	});

	let hoverIndex = $state<number | null>(null);

	function onPointerMove(event: PointerEvent) {
		if (!points.length) return;
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const x = event.clientX - rect.left;
		let nearest = 0;
		let nearestDist = Infinity;
		for (let i = 0; i < points.length; i++) {
			const dist = Math.abs(points[i].x - x);
			if (dist < nearestDist) {
				nearestDist = dist;
				nearest = i;
			}
		}
		hoverIndex = nearest;
	}

	function onPointerLeave() {
		hoverIndex = null;
	}

	const hovered = $derived(hoverIndex !== null ? points[hoverIndex] : null);
</script>

{#if data.length === 0}
	<Empty class="border border-dashed bg-card">
		<EmptyDescription>Zatím nejsou žádná data o sledování v čase.</EmptyDescription>
	</Empty>
{:else}
	<div bind:clientWidth={containerWidth} class="relative w-full">
		<svg
			width={containerWidth}
			{height}
			role="img"
			aria-label="Počet souběžných diváků v čase"
			onpointermove={onPointerMove}
			onpointerleave={onPointerLeave}
		>
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

			<!-- x axis labels -->
			{#each xTickTimes as time, i (i)}
				<text
					x={xFor(time)}
					y={height - padding.bottom + 16}
					text-anchor="middle"
					class="fill-muted-foreground text-[10px]"
				>
					{formatTime(time)}
				</text>
			{/each}

			<!-- area fill -->
			<path d={areaPath} fill="var(--primary)" opacity="0.1" stroke="none" />

			<!-- line -->
			<path
				d={linePath}
				fill="none"
				stroke="var(--primary)"
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>

			<!-- end marker -->
			{#if points.length > 0}
				<circle
					cx={points[points.length - 1].x}
					cy={points[points.length - 1].y}
					r="4"
					fill="var(--primary)"
					stroke="var(--card)"
					stroke-width="2"
				/>
			{/if}

			<!-- hover crosshair -->
			{#if hovered}
				<line
					x1={hovered.x}
					x2={hovered.x}
					y1={padding.top}
					y2={height - padding.bottom}
					stroke="var(--border)"
					stroke-width="1"
				/>
				<circle
					cx={hovered.x}
					cy={hovered.y}
					r="4"
					fill="var(--primary)"
					stroke="var(--card)"
					stroke-width="2"
				/>
			{/if}
		</svg>

		{#if hovered}
			<div
				class="pointer-events-none absolute top-2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
				style:left="{Math.min(Math.max(hovered.x, 60), containerWidth - 60)}px"
				style:transform="translateX(-50%)"
			>
				<p class="font-semibold text-popover-foreground">
					{formatTime(hovered.d.bucket.getTime())}
				</p>
				<p class="text-muted-foreground">
					{hovered.d.viewers}
					{formatViewerNoun(hovered.d.viewers)}
				</p>
			</div>
		{/if}
	</div>
{/if}
