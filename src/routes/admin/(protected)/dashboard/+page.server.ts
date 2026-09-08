import { desc, isNull } from 'drizzle-orm';
import { getAccessStats } from '$lib/server/access-log';
import { getRevenueTotal } from '$lib/server/conferences';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import {
	getMonthlyViewershipTimeline,
	getRecentConferenceWatchSummary,
	getUsersByWatchTime
} from '$lib/server/watch-tracking';
import type { PageServerLoad } from './$types';

function byStartsAtAsc(a: { startsAt: Date | null }, b: { startsAt: Date | null }) {
	if (!a.startsAt) return 1;
	if (!b.startsAt) return -1;
	return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
}

export const load: PageServerLoad = async () => {
	const conferences = await db
		.select()
		.from(conference)
		.where(isNull(conference.deactivatedAt))
		.orderBy(desc(conference.startsAt), desc(conference.createdAt));

	const stats = await getAccessStats();
	const revenue = await getRevenueTotal();
	const monthlyViewership = await getMonthlyViewershipTimeline();
	const usersByWatchTime = await getUsersByWatchTime(8);
	const watchSummary = await getRecentConferenceWatchSummary(6);

	// Live conferences always lead, then the soonest upcoming, then the most
	// recently ended — so whatever needs attention right now surfaces first.
	const live = conferences.filter((c) => c.status === 'live');
	const upcoming = conferences.filter((c) => c.status === 'upcoming').sort(byStartsAtAsc);
	const ended = conferences.filter((c) => c.status === 'ended').sort((a, b) => byStartsAtAsc(b, a));

	const CONFERENCE_LIST_SIZE = 4;
	const orderedConferences = [...live, ...upcoming, ...ended].slice(0, CONFERENCE_LIST_SIZE);
	// How many of the *visible* rows are live — the template puts a divider
	// right after them, but only when there's something below it to divide.
	const liveCountVisible = Math.min(live.length, orderedConferences.length);

	return {
		conferenceCount: conferences.length,
		stats,
		revenue,
		orderedConferences,
		liveCountVisible,
		monthlyViewership,
		usersByWatchTime,
		watchSummary
	};
};
