import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { resolve } from '$app/paths';
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
		.where(and(eq(accessGrant.userId, customer.id), isNull(conference.deactivatedAt)));

	const grantedConferenceIds = new Set(grants.map((g) => g.conferenceId));

	const conferences = await db
		.select()
		.from(conference)
		.where(isNull(conference.deactivatedAt))
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
			.where(and(eq(conference.id, conferenceId), isNull(conference.deactivatedAt)));

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
			await sendAccessGrantedEmail(customer.email, foundConference.title, foundConference.id);
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
	},

	// Customers have no soft-delete (unlike conferences) — this removes the
	// row outright. Cascades to their access grants, watch history, and any
	// pending invite. The load above already 404s on an admin's own id, so
	// this can never be reached for an admin account.
	deleteUser: async ({ params }) => {
		await db.delete(user).where(eq(user.id, params.id));
		redirect(303, resolve('/admin/uzivatele'));
	},

	updateUser: async ({ request, params }) => {
		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString().trim();
		const lastName = formData.get('lastName')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();

		if (!firstName || !lastName || !email) {
			return fail(400, { updateError: 'Vyplňte prosím všechna pole.' });
		}

		const [emailTaken] = await db
			.select({ id: user.id })
			.from(user)
			.where(and(eq(user.email, email), ne(user.id, params.id)));
		if (emailTaken) {
			return fail(400, { updateError: 'Tento email už používá jiný účet.' });
		}

		await db.update(user).set({ firstName, lastName, email }).where(eq(user.id, params.id));

		return { updated: true };
	}
};
