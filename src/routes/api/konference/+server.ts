import { json } from '@sveltejs/kit';
import { conferenceSort, CONFERENCE_PAGE_SIZE, listConferencesPage } from '$lib/server/conferences';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const offset = Number(url.searchParams.get('offset')) || 0;
	const sortParam = url.searchParams.get('sort');
	const sort = conferenceSort.find((s) => s === sortParam) ?? 'default';
	const page = await listConferencesPage(
		offset,
		locals.user,
		CONFERENCE_PAGE_SIZE,
		undefined,
		sort
	);

	return json(page);
};
