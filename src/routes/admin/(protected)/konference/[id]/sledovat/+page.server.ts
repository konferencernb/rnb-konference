import { count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessGrant } from '$lib/server/db/schema';
import {
	getAllExpectedViewersWithStatus,
	getCurrentViewers,
	getLiveViewers,
	getViewerTimeline,
	getWatchStats
} from '$lib/server/watch-tracking';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [{ expectedViewers }] = await db
		.select({ expectedViewers: count() })
		.from(accessGrant)
		.where(eq(accessGrant.conferenceId, params.id));

	const {
		currentlyWatching,
		totalViewers,
		totalWatchSeconds,
		watchedLiveCount,
		watchedRecordedCount
	} = await getWatchStats(params.id);
	const currentViewers = await getCurrentViewers(params.id);
	const allViewers = await getAllExpectedViewersWithStatus(params.id);
	const liveViewers = await getLiveViewers(params.id);
	const liveViewerTimeline = await getViewerTimeline(params.id, { isLive: true });

	return {
		expectedViewers,
		currentlyWatching,
		totalViewers,
		totalWatchSeconds,
		watchedLiveCount,
		watchedRecordedCount,
		currentViewers,
		allViewers,
		liveViewers,
		liveViewerTimeline
	};
};
