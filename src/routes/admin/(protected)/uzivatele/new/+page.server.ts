import { fail, redirect } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { accessGrant, conference, user } from '$lib/server/db/schema';
import { sendAccessGrantedEmail } from '$lib/server/email';
import { createInvite } from '$lib/server/invites';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const conferences = await db
		.select({ id: conference.id, title: conference.title })
		.from(conference)
		.where(isNull(conference.deactivatedAt))
		.orderBy(conference.title);

	return { conferences };
};

// Looks the conference up by its exact (still-active) title, skips a grant
// that already exists instead of erroring on it (an admin re-running the same
// invite shouldn't see "already exists" as a failure), and sends the "access
// granted" email either way.
async function grantConferenceByTitle(userId: string, conferenceTitle: string, grantedBy: string) {
	const [found] = await db
		.select()
		.from(conference)
		.where(and(eq(conference.title, conferenceTitle), isNull(conference.deactivatedAt)));

	if (!found) return { error: `Konference „${conferenceTitle}“ nenalezena.` as const };

	const [existing] = await db
		.select({ id: accessGrant.id })
		.from(accessGrant)
		.where(and(eq(accessGrant.userId, userId), eq(accessGrant.conferenceId, found.id)));
	if (existing) return { ok: true as const, emailSent: true };

	await db.insert(accessGrant).values({ userId, conferenceId: found.id, grantedBy });

	const [grantedUser] = await db.select().from(user).where(eq(user.id, userId));
	const emailSent = grantedUser
		? await sendAccessGrantedEmail(grantedUser.email, found.title, found.id)
		: false;

	return { ok: true as const, emailSent };
}

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString().trim();
		const lastName = formData.get('lastName')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const conferenceTitlesRaw = formData.get('conferenceTitles')?.toString();
		const conferenceTitles = conferenceTitlesRaw
			? (JSON.parse(conferenceTitlesRaw) as string[])
			: [];

		if (!firstName) return fail(400, { error: 'Jméno je povinné.' });
		if (!lastName) return fail(400, { error: 'Příjmení je povinné.' });
		if (!email) return fail(400, { error: 'Email je povinný.' });

		const result = await createInvite({ firstName, lastName, email });

		if ('error' in result) {
			return fail(400, { error: result.error });
		}

		for (const title of conferenceTitles) {
			await grantConferenceByTitle(result.user.id, title, locals.user!.id);
		}

		redirect(303, resolve('/admin/(protected)/uzivatele/[id]', { id: result.user.id }));
	}
};
