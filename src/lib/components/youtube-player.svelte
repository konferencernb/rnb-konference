<script lang="ts">
	import Maximize from '@lucide/svelte/icons/maximize';
	import Minimize from '@lucide/svelte/icons/minimize';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import VolumeX from '@lucide/svelte/icons/volume-x';
	import { getYoutubeVideoId } from '$lib/youtube';

	let {
		videoUrl,
		title,
		isLive = false
	}: { videoUrl: string; title: string; isLive?: boolean } = $props();

	function formatTime(seconds: number) {
		if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function loadYoutubeApi(): Promise<void> {
		if (window.YT?.Player) return Promise.resolve();
		return new Promise((resolve) => {
			const existing = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				existing?.();
				resolve();
			};
			if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
				const script = document.createElement('script');
				script.src = 'https://www.youtube.com/iframe_api';
				document.head.appendChild(script);
			}
		});
	}

	let wrapper = $state<HTMLDivElement>();
	let target = $state<HTMLDivElement>();
	let player: YT.Player | undefined;

	let playing = $state(false);
	let muted = $state(true);
	let volume = $state(50);
	let currentTime = $state(0);
	let duration = $state(0);
	let isFullscreen = $state(false);
	let showControls = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	// Set either up front (an unparseable URL never reaches YT.Player at all)
	// or from the player's own onError — without this the black box just sits
	// there doing nothing when clicked, with no indication anything's wrong.
	let playbackError = $state(!getYoutubeVideoId(videoUrl));

	function scheduleHide() {
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			showControls = false;
		}, 2500);
	}

	function revealControls() {
		showControls = true;
		if (playing) scheduleHide();
	}

	$effect(() => {
		if (playing) {
			scheduleHide();
		} else {
			showControls = true;
			if (hideTimer) clearTimeout(hideTimer);
		}

		return () => {
			if (hideTimer) clearTimeout(hideTimer);
		};
	});

	$effect(() => {
		if (!target || playbackError) return;
		let cancelled = false;
		let pollHandle: ReturnType<typeof setInterval> | undefined;

		loadYoutubeApi().then(() => {
			if (cancelled || !target) return;

			const instance = new YT.Player(target, {
				videoId: getYoutubeVideoId(videoUrl),
				playerVars: {
					autoplay: 1,
					mute: 1,
					controls: 0,
					disablekb: 1,
					fs: 0,
					modestbranding: 1,
					rel: 0,
					iv_load_policy: 3
				},
				events: {
					onReady: (event: YT.PlayerEvent) => {
						duration = event.target.getDuration();
						volume = event.target.getVolume();
						muted = event.target.isMuted();
						pollHandle = setInterval(() => {
							currentTime = instance.getCurrentTime();
							duration = instance.getDuration();
						}, 500);
					},
					onStateChange: (event: YT.OnStateChangeEvent) => {
						playing = event.data === YT.PlayerState.PLAYING;
					},
					// Error codes: 2 invalid videoId, 5 HTML5 player error, 100 video
					// not found/removed/private, 101/150 embedding disabled by owner.
					onError: () => {
						playbackError = true;
					}
				}
			});

			player = instance;
		});

		return () => {
			cancelled = true;
			if (pollHandle) clearInterval(pollHandle);
			player?.destroy();
			player = undefined;
		};
	});

	$effect(() => {
		function onFullscreenChange() {
			isFullscreen = document.fullscreenElement === wrapper;
		}
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
	});

	function togglePlay() {
		if (!player) return;
		if (playing) player.pauseVideo();
		else player.playVideo();
	}

	function toggleMute() {
		if (!player) return;
		if (muted) {
			player.unMute();
			if (volume === 0) {
				volume = 50;
				player.setVolume(50);
			}
		} else {
			player.mute();
		}
		muted = !muted;
	}

	function onVolumeInput(event: Event) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		volume = value;
		player?.setVolume(value);
		if (value === 0) {
			player?.mute();
			muted = true;
		} else if (muted) {
			player?.unMute();
			muted = false;
		}
	}

	function onSeekInput(event: Event) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		currentTime = value;
		player?.seekTo(value, true);
	}

	async function toggleFullscreen() {
		if (!wrapper) return;
		if (document.fullscreenElement === wrapper) {
			await document.exitFullscreen();
		} else {
			await wrapper.requestFullscreen();
		}
	}
</script>

<div
	bind:this={wrapper}
	class="relative aspect-video w-full overflow-hidden rounded-lg bg-black select-none"
	role="group"
	aria-label={title}
	onpointermove={revealControls}
>
	<div bind:this={target} class="pointer-events-none h-full w-full"></div>

	{#if playbackError}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black px-6 text-center"
		>
			<TriangleAlert class="size-8 text-white/70" />
			<p class="font-medium text-white">Přenos se nepodařilo načíst</p>
			<p class="text-sm text-white/60">Zkuste to prosím později, nebo nás kontaktujte.</p>
		</div>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute inset-0 flex cursor-pointer items-center justify-center {playing
				? ''
				: 'bg-black'}"
			oncontextmenu={(event) => event.preventDefault()}
			onclick={togglePlay}
		>
			{#if !playing}
				<Play class="size-16 text-white/90" />
			{/if}
		</div>

		<div
			class="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t from-black/80 to-transparent px-3 pt-6 pb-2 transition-opacity duration-300 {showControls
				? 'opacity-100'
				: 'pointer-events-none opacity-0'}"
		>
			{#if !isLive}
				<input
					type="range"
					min="0"
					max={duration || 0}
					step="1"
					value={currentTime}
					oninput={onSeekInput}
					class="h-1 w-full cursor-pointer accent-white"
					aria-label="Průběh přehrávání"
				/>
			{/if}
			<div class="flex items-center gap-3 text-white">
				<button
					type="button"
					onclick={togglePlay}
					class="cursor-pointer"
					aria-label={playing ? 'Pauza' : 'Přehrát'}
				>
					{#if playing}
						<Pause class="size-5" />
					{:else}
						<Play class="size-5" />
					{/if}
				</button>
				<button
					type="button"
					onclick={toggleMute}
					class="cursor-pointer"
					aria-label={muted ? 'Zapnout zvuk' : 'Ztlumit'}
				>
					{#if muted || volume === 0}
						<VolumeX class="size-5" />
					{:else}
						<Volume2 class="size-5" />
					{/if}
				</button>
				<input
					type="range"
					min="0"
					max="100"
					step="1"
					value={muted ? 0 : volume}
					oninput={onVolumeInput}
					class="h-1 w-20 cursor-pointer accent-white"
					aria-label="Hlasitost"
				/>
				{#if !isLive}
					<span class="text-xs tabular-nums"
						>{formatTime(currentTime)} / {formatTime(duration)}</span
					>
				{/if}
				<button
					type="button"
					onclick={toggleFullscreen}
					class="ml-auto cursor-pointer"
					aria-label={isFullscreen ? 'Ukončit celou obrazovku' : 'Celá obrazovka'}
				>
					{#if isFullscreen}
						<Minimize class="size-5" />
					{:else}
						<Maximize class="size-5" />
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
