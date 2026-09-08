import { error, json } from '@sveltejs/kit';
import { listCustomersPage } from '$lib/server/customers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (locals.user?.role !== 'admin') {
		error(403, 'Forbidden');
	}

	const offset = Number(url.searchParams.get('offset')) || 0;
	const page = await listCustomersPage(offset);

	return json(page);
};
