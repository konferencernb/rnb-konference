import { error, json } from '@sveltejs/kit';
import { listAccessLog } from '$lib/server/access-log';
import type { RequestHandler } from './$types';

const PAGE_SIZE = 30;

export const GET: RequestHandler = async ({ url, locals }) => {
	if (locals.user?.role !== 'admin') {
		error(403, 'Forbidden');
	}

	const offset = Number(url.searchParams.get('offset')) || 0;
	const page = await listAccessLog(PAGE_SIZE, offset);

	return json(page);
};
