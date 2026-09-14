import { getLiveConference } from '$lib/server/conferences';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { user: locals.user, liveConference: await getLiveConference() };
};
