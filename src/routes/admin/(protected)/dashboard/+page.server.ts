import { desc } from 'drizzle-orm';
import { getAccessStats, listAccessLog } from '$lib/server/access-log';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const conferences = await db
		.select()
		.from(conference)
		.orderBy(desc(conference.startsAt), desc(conference.createdAt));

	const stats = await getAccessStats();
	const { entries: recentAccess } = await listAccessLog(5);

	const upcomingConferences = conferences
		.filter((c) => c.status === 'upcoming' || c.status === 'live')
		.sort((a, b) => {
			if (!a.startsAt) return 1;
			if (!b.startsAt) return -1;
			return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
		})
		.slice(0, 5);

	return { conferenceCount: conferences.length, stats, recentAccess, upcomingConferences };
};
