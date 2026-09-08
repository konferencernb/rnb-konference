// Companion to $lib/server/prague-time.ts's parsePragueDatetimeLocal — this
// direction formats a stored UTC instant back into the wall-clock string a
// <input type="datetime-local"> expects, always read as Europe/Prague time
// regardless of where this runs (SSR on the server, or after hydration in
// the browser) so pre-filling the edit form round-trips consistently with
// what submitting it actually saves. Plain $lib (not $lib/server) since it's
// used directly from a .svelte component's markup.
export function formatPragueDatetimeLocal(value: string | Date | null): string {
	if (!value) return '';
	const date = new Date(value);

	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Prague',
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}).formatToParts(date);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

	return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// A `.toLocaleDateString('cs-CZ')`/`.toLocaleTimeString(...)`/`.toLocaleString(...)`
// call with no explicit `timeZone` reads the *ambient* one — the browser's
// after hydration, but whatever the server process happens to run in during
// SSR. Every viewer here is Czech, so these three wrap the native calls with
// `timeZone: 'Europe/Prague'` forced in, the display-side counterpart to
// parsePragueDatetimeLocal()/formatPragueDatetimeLocal() above: a date near
// midnight rendered on a UTC-timezone production server would otherwise show
// the wrong calendar day until the client re-renders it correctly.
export function formatPragueDate(
	value: string | number | Date,
	options?: Intl.DateTimeFormatOptions
): string {
	return new Date(value).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague', ...options });
}

export function formatPragueTime(
	value: string | number | Date,
	options?: Intl.DateTimeFormatOptions
): string {
	return new Date(value).toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', ...options });
}

export function formatPragueDateTime(
	value: string | number | Date,
	options?: Intl.DateTimeFormatOptions
): string {
	return new Date(value).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', ...options });
}
