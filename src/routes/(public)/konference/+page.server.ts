import { conferenceSort, CONFERENCE_PAGE_SIZE, listConferencesPage } from '$lib/server/conferences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const sortParam = url.searchParams.get('sort');
	const sort = conferenceSort.find((s) => s === sortParam) ?? 'default';

	const { conferences, hasMore } = await listConferencesPage(
		0,
		locals.user,
		CONFERENCE_PAGE_SIZE,
		undefined,
		sort
	);

	return { conferences, hasMore, sort };
};
