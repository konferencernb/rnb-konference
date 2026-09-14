import { listAccessLog } from '$lib/server/access-log';
import { listEmailLog } from '$lib/server/email-log';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 30;

export const load: PageServerLoad = async () => {
	const [accessLog, emailLog] = await Promise.all([
		listAccessLog(PAGE_SIZE),
		listEmailLog(PAGE_SIZE)
	]);

	return {
		entries: accessLog.entries,
		hasMore: accessLog.hasMore,
		emailEntries: emailLog.entries,
		emailHasMore: emailLog.hasMore
	};
};
