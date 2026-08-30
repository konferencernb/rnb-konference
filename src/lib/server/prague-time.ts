// A <input type="datetime-local"> gives back a plain wall-clock string with
// no timezone attached (e.g. "2026-09-15T14:30") — `new Date(value)` treats
// that as local time *in whatever timezone the server process happens to
// run in*. That's silently correct on a dev machine already set to
// Europe/Prague, but on a production host defaulting to UTC (the norm for
// most cloud platforms) the exact same admin input would land 1-2 hours off
// (depending on DST) with no error anywhere. Every conference's audience is
// Czech, so the input is always meant as Prague wall-clock time regardless
// of where this process runs — parse it as such explicitly rather than
// trusting the ambient server timezone.
export function parsePragueDatetimeLocal(value: string): Date {
	// First, a wrong-on-purpose guess: read the wall-clock numbers as if they
	// were already UTC.
	const asIfUtc = new Date(`${value}:00.000Z`);

	// Ask what that instant's clock reads in Prague — the gap between that
	// and our guess is exactly how far off the guess was.
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Prague',
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(asIfUtc);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

	const pragueReadingAsUtcMs = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second')
	);
	const offsetMs = pragueReadingAsUtcMs - asIfUtc.getTime();

	return new Date(asIfUtc.getTime() - offsetMs);
}
