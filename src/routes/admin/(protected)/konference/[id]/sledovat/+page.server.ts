import { count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessGrant } from '$lib/server/db/schema';
import {
	getAllExpectedViewersWithStatus,
	getCurrentViewers,
	getLiveViewers,
	getRecordedViewers,
	getViewerTimeline,
	getWatchStats
} from '$lib/server/watch-tracking';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { conference } = await parent();

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
	const recordedViewers = await getRecordedViewers(params.id);
	// Only extend the chart to "now" while the conference is still live —
	// once it's ended, that would just pad the timeline with a long flat
	// tail of zeros between the stream and whenever an admin happens to
	// check this page. See getViewerTimeline's own comment for the rest.
	const liveViewerTimeline = await getViewerTimeline(params.id, {
		isLive: true,
		extendToNow: conference.status === 'live'
	});

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
		recordedViewers,
		liveViewerTimeline
	};
};
