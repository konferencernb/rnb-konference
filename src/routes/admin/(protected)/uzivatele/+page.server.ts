import { listCustomersPage } from '$lib/server/customers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { customers, hasMore } = await listCustomersPage(0);

	return { customers, hasMore };
};
