import { browser } from '$app/environment';

const KEY = 'intro-animation-played';

// True only the very first time this is called in a browser tab session —
// every later call (a fresh mount from navigating back to a page already
// seen this session, a reload, whatever) returns false, so entrance
// animations don't replay every time the visitor bounces between pages
// they've already seen. Resets when the tab/browser closes.
export function shouldPlayIntroAnimation() {
	if (!browser) return false;

	try {
		if (sessionStorage.getItem(KEY)) return false;
		sessionStorage.setItem(KEY, '1');
		return true;
	} catch {
		// Storage blocked (private mode, etc.) — fail open rather than never
		// animating at all.
		return true;
	}
}
