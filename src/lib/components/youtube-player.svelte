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
	// Once true, stays true — lets the pause overlay tell "never started yet"
	// (nothing to show, keep it solid black) apart from "paused mid-video"
	// (the last real frame is sitting right there, no reason to hide it).
	let hasStarted = $state(false);
	let muted = $state(false);
	let volume = $state(50);
	let currentTime = $state(0);
	let duration = $state(0);
	// Native element fullscreen only works on desktop and Android Chrome. On
	// iOS Safari `Element.requestFullscreen` doesn't exist for anything but a
	// real <video>, so there we fall back to a fixed, viewport-filling
	// overlay ("pseudo fullscreen").
	let nativeFullscreen = $state(false);
	let pseudoFullscreen = $state(false);
	const isFullscreen = $derived(nativeFullscreen || pseudoFullscreen);

	// Tracks the device's actual orientation so fullscreen can fall back to
	// visually rotating the player when a real landscape lock isn't
	// available (see the effect below) — most notably iOS Safari, which
	// doesn't implement the Screen Orientation API at all.
	let isPortrait = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(orientation: portrait)');
		isPortrait = mq.matches;
		function onChange() {
			isPortrait = mq.matches;
		}
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	// Best-effort real landscape lock while fullscreen — works on Android
	// Chrome (only while actually in native Fullscreen), silently does
	// nothing anywhere it isn't supported or allowed (iOS Safari, desktop).
	// Where it fails, `isPortrait` above stays true and the template rotates
	// the player with CSS instead — see the wrapper's class below.
	$effect(() => {
		if (!isFullscreen) return;
		const orientation = (
			screen as unknown as {
				orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void };
			}
		).orientation;
		orientation?.lock?.('landscape').catch(() => {});
		return () => orientation?.unlock?.();
	});
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
		}, 4500);
	}

	function revealControls() {
		showControls = true;
		if (playing && !isFullscreen) scheduleHide();
	}

	// The idle timer above is for "stopped moving but the pointer's still
	// there" — leaving the player entirely is a stronger, immediate signal
	// that the hover is over, so don't make it wait out the same 4.5s. Only
	// while actually playing: if paused, controls (and the zoom) are meant to
	// stay up regardless of the pointer, per the effect below.
	function onPointerLeave() {
		if (!playing || isFullscreen) return;
		if (hideTimer) clearTimeout(hideTimer);
		showControls = false;
	}

	$effect(() => {
		// Controls never auto-hide in fullscreen — with no mouse to "hover"
		// on a touchscreen, a hidden control bar has no way back except
		// tapping blind (the same tap the center play/pause overlay already
		// claims), which made the exit-fullscreen button feel unresponsive.
		if (playing && !isFullscreen) {
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
				width: '100%',
				height: '100%',
				videoId: getYoutubeVideoId(videoUrl),
				playerVars: {
					autoplay: 1,
					// Muted so autoplay is reliably allowed (browsers universally
					// permit muted autoplay, not unmuted) — unmuted to half volume
					// immediately below in onReady instead of staying silent.
					mute: 1,
					controls: 0,
					disablekb: 1,
					fs: 0,
					rel: 0,
					iv_load_policy: 3
				},
				events: {
					onReady: (event: YT.PlayerEvent) => {
						duration = event.target.getDuration();
						event.target.setVolume(50);
						event.target.unMute();
						volume = 50;
						muted = false;
						pollHandle = setInterval(() => {
							currentTime = instance.getCurrentTime();
							duration = instance.getDuration();
						}, 500);
					},
					onStateChange: (event: YT.OnStateChangeEvent) => {
						const nowPlaying = event.data === YT.PlayerState.PLAYING;
						if (nowPlaying && !hasStarted) {
							hasStarted = true;
						}
						playing = nowPlaying;
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
			nativeFullscreen =
				document.fullscreenElement === wrapper ||
				(document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ===
					wrapper;
		}
		document.addEventListener('fullscreenchange', onFullscreenChange);
		document.addEventListener('webkitfullscreenchange', onFullscreenChange);
		return () => {
			document.removeEventListener('fullscreenchange', onFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
		};
	});

	// Esc leaves the pseudo-fullscreen overlay (native fullscreen handles its
	// own Esc). Also lock body scroll while the overlay is up.
	$effect(() => {
		if (!pseudoFullscreen) return;
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') pseudoFullscreen = false;
		}
		document.addEventListener('keydown', onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	});

	function togglePlay() {
		if (!player) return;
		if (playing) {
			player.pauseVideo();
		} else {
			player.playVideo();
		}
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

		const doc = document as unknown as {
			webkitFullscreenElement?: Element;
			webkitExitFullscreen?: () => Promise<void> | void;
		};
		const el = wrapper as unknown as {
			webkitRequestFullscreen?: () => Promise<void> | void;
		};

		if (nativeFullscreen) {
			await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
			return;
		}
		if (pseudoFullscreen) {
			pseudoFullscreen = false;
			return;
		}

		const request =
			wrapper.requestFullscreen?.bind(wrapper) ?? el.webkitRequestFullscreen?.bind(el);
		if (request) {
			try {
				await request();
				return;
			} catch {
				// Fall through to the overlay fallback (e.g. iOS rejects it).
			}
		}
		pseudoFullscreen = true;
	}
</script>

<div
	bind:this={wrapper}
	class="touch-manipulation overflow-hidden bg-black select-none {pseudoFullscreen
		? isPortrait
			? 'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rotate-90'
			: 'fixed inset-0 z-50'
		: 'relative aspect-video w-full rounded-lg'}"
	style={pseudoFullscreen && isPortrait ? 'width: 100vh; height: 100vw;' : ''}
	role="group"
	aria-label={title}
	onpointermove={revealControls}
	onpointerdown={revealControls}
	onpointerleave={onPointerLeave}
>
	<div bind:this={target} class="pointer-events-none absolute inset-0"></div>

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
			class="absolute inset-0 flex cursor-pointer touch-manipulation items-center justify-center {playing
				? ''
				: hasStarted
					? 'bg-black/40'
					: 'bg-black'}"
			oncontextmenu={(event) => event.preventDefault()}
			onclick={togglePlay}
		>
			{#if !playing}
				<Play class="size-16 text-white/90" />
			{/if}
		</div>

		<div
			class="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-linear-to-t from-black/80 to-transparent px-3 pt-6 pb-2 transition-opacity duration-300 {showControls
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
			<div class="flex items-center gap-2 text-white">
				<button
					type="button"
					onclick={togglePlay}
					class="flex cursor-pointer items-center justify-center p-1.5"
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
					class="flex cursor-pointer items-center justify-center p-1.5"
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
					class="ml-auto flex cursor-pointer items-center justify-center p-1.5"
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
