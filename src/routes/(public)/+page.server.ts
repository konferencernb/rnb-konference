import { listConferencesPage } from '$lib/server/conferences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { conferences } = await listConferencesPage(0, locals.user, 3, 'ended');

	return { conferences };
};
