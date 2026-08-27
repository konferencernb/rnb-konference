import { listAccessLog } from '$lib/server/access-log';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 30;

export const load: PageServerLoad = async () => {
	const { entries, hasMore } = await listAccessLog(PAGE_SIZE);

	return { entries, hasMore };
};
