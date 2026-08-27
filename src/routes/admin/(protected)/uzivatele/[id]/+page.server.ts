import { error, fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessGrant, conference, user, watchSession } from '$lib/server/db/schema';
import { sendAccessGrantedEmail } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [customer] = await db.select().from(user).where(eq(user.id, params.id));

	if (!customer || customer.role === 'admin') {
		error(404, 'Uživatel nenalezen');
	}

	const grants = await db
		.select({
			id: accessGrant.id,
			grantedAt: accessGrant.grantedAt,
			conferenceId: conference.id,
			conferenceTitle: conference.title,
			liveWatchSeconds: watchSession.liveWatchSeconds,
			recordedWatchSeconds: watchSession.recordedWatchSeconds
		})
		.from(accessGrant)
		.innerJoin(conference, eq(accessGrant.conferenceId, conference.id))
		.leftJoin(
			watchSession,
			and(eq(watchSession.conferenceId, conference.id), eq(watchSession.userId, accessGrant.userId))
		)
		.where(eq(accessGrant.userId, customer.id));

	const grantedConferenceIds = new Set(grants.map((g) => g.conferenceId));

	const conferences = await db
		.select()
		.from(conference)
		.orderBy(desc(conference.startsAt), desc(conference.createdAt));
	const availableConferences = conferences.filter((c) => !grantedConferenceIds.has(c.id));

	return { customer, grants, availableConferences };
};

export const actions: Actions = {
	grantAccess: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const conferenceId = formData.get('conferenceId')?.toString();

		if (!conferenceId) return fail(400, { grantError: 'Vyberte konferenci.' });

		const [foundConference] = await db
			.select()
			.from(conference)
			.where(eq(conference.id, conferenceId));

		if (!foundConference) return fail(400, { grantError: 'Konference nenalezena.' });

		await db
			.insert(accessGrant)
			.values({
				userId: params.id,
				conferenceId,
				grantedBy: locals.user!.id
			})
			.onConflictDoNothing();

		const [customer] = await db.select().from(user).where(eq(user.id, params.id));
		if (customer) {
			await sendAccessGrantedEmail(customer.email, foundConference.title);
		}

		return { granted: true };
	},

	revokeAccess: async ({ request, params }) => {
		const formData = await request.formData();
		const grantId = formData.get('grantId')?.toString();

		if (!grantId) return fail(400, { error: 'Chybí id přístupu.' });

		await db
			.delete(accessGrant)
			.where(and(eq(accessGrant.id, grantId), eq(accessGrant.userId, params.id)));

		return { revoked: true };
	}
};
