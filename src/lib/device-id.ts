const DEVICE_ID_KEY = 'device-id';

// Identifies this browser (not this tab — localStorage is shared across
// tabs/reloads of the same browser profile, but not across different
// browsers or devices) across visits, so the server can tell "the same
// person reopened this tab" apart from "a genuinely different device is now
// watching too" for the concurrent-viewer check ($lib/server/active-viewer.ts).
// Never sent anywhere except the heartbeat endpoint.
export function getDeviceId() {
	try {
		let id = localStorage.getItem(DEVICE_ID_KEY);
		if (!id) {
			id = crypto.randomUUID();
			localStorage.setItem(DEVICE_ID_KEY, id);
		}
		return id;
	} catch {
		// Private browsing / blocked storage — a per-load id just means this
		// browser won't be recognized across reloads, not a functional break.
		return crypto.randomUUID();
	}
}
