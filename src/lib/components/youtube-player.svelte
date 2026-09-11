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

	// YouTube decides how aggressively to brand the player based partly on
	// its own *native* render size — confirmed live: a player rendered small
	// (mobile width) shows much more branding than the same crop that fully
	// hid it at a larger size, even at a heavier crop. So the iframe is
	// always instantiated at this fixed, "desktop-class" size regardless of
	// how big it's actually displayed, and `baseScale` below shrinks the
	// whole thing back down to fit — the crop below then only has to clean
	// up the same modest amount of branding every time, mobile included.
	const NATIVE_WIDTH = 1280;
	const NATIVE_HEIGHT = 720;
	let baseScale = $state(1);

	$effect(() => {
		if (!wrapper) return;
		const el = wrapper;

		function measure() {
			// min(), not just width — the wrapper is exactly 16:9 normally
			// (aspect-video, so width alone would do), but the pseudo-fullscreen
			// overlay fills the actual screen, whatever shape that is, and
			// this keeps the video centered and fully contained either way
			// instead of overflowing a portrait screen's height.
			baseScale = Math.min(el.clientWidth / NATIVE_WIDTH, el.clientHeight / NATIVE_HEIGHT);
		}

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	});

	let playing = $state(false);
	// Once true, stays true — lets the pause overlay tell "never started yet"
	// (nothing to show, keep it solid black) apart from "paused mid-video"
	// (the last real frame is sitting right there, no reason to hide it).
	let hasStarted = $state(false);
	let muted = $state(true);
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
	let showControls = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	// Set either up front (an unparseable URL never reaches YT.Player at all)
	// or from the player's own onError — without this the black box just sits
	// there doing nothing when clicked, with no indication anything's wrong.
	let playbackError = $state(!getYoutubeVideoId(videoUrl));
	// YouTube briefly shows its own title/channel card and a "more videos" +
	// logo corner overlay for the first few seconds whenever playback starts
	// (autoplay or a real click, confirmed either way) — it's part of the
	// iframe's own rendered content, not something a playerVars option can
	// turn off, and it never recurs once past this window (not on hover, not
	// on pause/resume in testing). Rather than covering the player (visible
	// delay before anything shows) or permanently cropping it (loses part of
	// the picture forever), the video plays immediately zoomed in just
	// enough to push those elements outside the visible frame, then eases
	// back out to the real framing once the window has passed — starts
	// `true` so a video that autoplays immediately is already zoomed in
	// before the first frame ever paints.
	let starting = $state(true);
	let startingTimer: ReturnType<typeof setTimeout> | undefined;

	// Also zoom whenever the controls are showing — on hover (via
	// `showControls`, which goes true on pointer move and back to false once
	// the idle timer hides the bar again, or the moment the pointer actually
	// leaves the player — see onPointerLeave) and while paused (the same
	// state is forced true there too). That way the zoom isn't a thing that
	// only ever happens once, right at launch, which would make it stand out
	// as exactly what it is.
	const zoomed = $derived(starting || showControls);

	function armStartingCover() {
		starting = true;
		if (startingTimer) clearTimeout(startingTimer);
		startingTimer = setTimeout(() => {
			starting = false;
		}, 4500);
	}

	function scheduleHide() {
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			showControls = false;
		}, 4500);
	}

	function revealControls() {
		showControls = true;
		if (playing) scheduleHide();
	}

	// The idle timer above is for "stopped moving but the pointer's still
	// there" — leaving the player entirely is a stronger, immediate signal
	// that the hover is over, so don't make it wait out the same 4.5s. Only
	// while actually playing: if paused, controls (and the zoom) are meant to
	// stay up regardless of the pointer, per the effect below.
	function onPointerLeave() {
		if (!playing) return;
		if (hideTimer) clearTimeout(hideTimer);
		showControls = false;
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
				// Native size on purpose — see the comment by NATIVE_WIDTH above.
				width: NATIVE_WIDTH,
				height: NATIVE_HEIGHT,
				videoId: getYoutubeVideoId(videoUrl),
				playerVars: {
					autoplay: 1,
					mute: 1,
					controls: 0,
					disablekb: 1,
					fs: 0,
					// modestbranding was retired by YouTube in Aug 2023 and no
					// longer does anything — left out rather than kept as a
					// no-op that implies this is still handled.
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
						const nowPlaying = event.data === YT.PlayerState.PLAYING;
						// Only the very first time playback actually starts — a live
						// stream re-enters PLAYING after every brief buffering blip,
						// and re-arming the timer on each of those meant it kept
						// getting pushed back and never actually fired. Re-arming on
						// a real user-initiated resume is togglePlay()'s job instead.
						if (nowPlaying && !hasStarted) {
							hasStarted = true;
							armStartingCover();
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
			if (startingTimer) clearTimeout(startingTimer);
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
			// A real resume (as opposed to the initial autoplay) also gets the
			// branding-hiding zoom again — confirmed separately that YouTube
			// re-shows its title/logo overlay after a manual pause too.
			if (hasStarted) armStartingCover();
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
	class="overflow-hidden bg-black select-none {pseudoFullscreen
		? 'fixed inset-0 z-50'
		: 'relative aspect-video w-full rounded-lg'}"
	role="group"
	aria-label={title}
	onpointermove={revealControls}
	onpointerdown={revealControls}
	onpointerleave={onPointerLeave}
>
	<!-- Base scale: renders the iframe at a fixed "desktop-class" native size
	(see NATIVE_WIDTH above) and shrinks the whole thing down to fit however
	big the player is actually displayed — recalculated on resize. -->
	<div
		class="pointer-events-none absolute top-1/2 left-1/2"
		style="width: {NATIVE_WIDTH}px; height: {NATIVE_HEIGHT}px; transform-origin: center center; transform: translate(-50%, -50%) scale({baseScale});"
	>
		<!-- The crop lives on this wrapper, never on `target` directly —
		YT.Player replaces `target`'s actual DOM node with its own <iframe> at
		init, so a reactive style bound to `target` itself keeps updating an
		invisible, detached element after that swap and the zoom would visibly
		get stuck. This div is never touched by YT.Player, so it stays reactive. -->
		<div
			class="h-full w-full transition-transform duration-700 ease-out"
			style="transform: scale({zoomed ? 1.3 : 1});"
		>
			<div bind:this={target} class="h-full w-full"></div>
		</div>
	</div>

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
