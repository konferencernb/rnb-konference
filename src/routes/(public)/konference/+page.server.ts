import { listConferencesPage } from '$lib/server/conferences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { conferences, hasMore } = await listConferencesPage(0, locals.user);

	return { conferences, hasMore };
};
