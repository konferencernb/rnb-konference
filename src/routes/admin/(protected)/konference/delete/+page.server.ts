import { fail } from '@sveltejs/kit';
import { listDeactivatedConferences, restoreConference } from '$lib/server/conferences';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const conferences = await listDeactivatedConferences();

	return { conferences };
};

export const actions: Actions = {
	restore: async ({ request }) => {
		const formData = await request.formData();
		const conferenceId = formData.get('conferenceId')?.toString();

		if (!conferenceId) return fail(400, { restoreError: 'Chybí id konference.' });

		await restoreConference(conferenceId);

		return { restored: true };
	}
};
