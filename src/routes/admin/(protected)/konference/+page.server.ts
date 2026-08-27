import { fail } from '@sveltejs/kit';
import { desc, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import { deactivateConference } from '$lib/server/conferences';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const conferences = await db
		.select()
		.from(conference)
		.where(isNull(conference.deactivatedAt))
		.orderBy(desc(conference.startsAt), desc(conference.createdAt));

	return { conferences };
};

export const actions: Actions = {
	deactivate: async ({ request }) => {
		const formData = await request.formData();
		const conferenceId = formData.get('conferenceId')?.toString();

		if (!conferenceId) return fail(400, { deactivateError: 'Chybí id konference.' });

		await deactivateConference(conferenceId);

		return { deactivated: true };
	}
};
