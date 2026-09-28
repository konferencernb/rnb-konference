import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { checkAndRecordActiveViewer } from '$lib/server/active-viewer';
import { hasConferenceAccess } from '$lib/server/access';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import { recordHeartbeat } from '$lib/server/watch-tracking';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, request, getClientAddress }) => {
	if (!locals.user) error(401, 'Přihlaste se prosím.');

	const unlocked = await hasConferenceAccess(locals.user, params.id);
	if (!unlocked) error(403, 'Forbidden');

	const [found] = await db
		.select({ status: conference.status })
		.from(conference)
		.where(eq(conference.id, params.id));
	if (!found) error(404, 'Konference nenalezena');

	await recordHeartbeat(params.id, locals.user.id, found.status === 'live');

	// Admins routinely open a stream from more than one place while checking
	// on it — the concurrency check exists to stop account sharing, not to
	// get in an admin's own way.
	let blocked = false;
	if (locals.user.role !== 'admin') {
		const body = await request.json().catch(() => null);
		const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : null;
		if (deviceId) {
			({ blocked } = await checkAndRecordActiveViewer(
				locals.user.id,
				deviceId,
				params.id,
				getClientAddress()
			));
		}
	}

	return json({ ok: true, blocked });
};
