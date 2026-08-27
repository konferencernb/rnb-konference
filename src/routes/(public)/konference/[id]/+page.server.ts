import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hasConferenceAccess } from '$lib/server/access';
import { db } from '$lib/server/db';
import { accessLog, conference } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, request, getClientAddress }) => {
	const [found] = await db.select().from(conference).where(eq(conference.id, params.id));

	if (!found) {
		error(404, 'Konference nenalezena');
	}

	const unlocked = await hasConferenceAccess(locals.user, found.id);

	if (locals.user?.role !== 'admin') {
		await db.insert(accessLog).values({
			conferenceId: found.id,
			userId: locals.user?.id,
			ipAddress: getClientAddress(),
			userAgent: request.headers.get('user-agent'),
			result: unlocked ? 'granted' : 'denied'
		});
	}

	return {
		conference: unlocked
			? found
			: {
					id: found.id,
					title: found.title,
					description: found.description,
					price: found.price,
					status: found.status,
					startsAt: found.startsAt
				},
		unlocked
	};
};
