import { json } from '@sveltejs/kit';
import { listConferencesPage } from '$lib/server/conferences';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const offset = Number(url.searchParams.get('offset')) || 0;
	const page = await listConferencesPage(offset, locals.user);

	return json(page);
};
