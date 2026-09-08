import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hasConferenceAccess } from '$lib/server/access';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import { recordHeartbeat } from '$lib/server/watch-tracking';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Přihlaste se prosím.');

	const unlocked = await hasConferenceAccess(locals.user, params.id);
	if (!unlocked) error(403, 'Forbidden');

	const [found] = await db
		.select({ status: conference.status })
		.from(conference)
		.where(eq(conference.id, params.id));
	if (!found) error(404, 'Konference nenalezena');

	await recordHeartbeat(params.id, locals.user.id, found.status === 'live');

	return json({ ok: true });
};
