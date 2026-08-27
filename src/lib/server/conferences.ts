import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessGrant, conference, type ConferenceStatus } from '$lib/server/db/schema';

export const CONFERENCE_PAGE_SIZE = 12;

export async function listConferencesPage(
	offset: number,
	user?: { id: string; role?: string },
	limit: number = CONFERENCE_PAGE_SIZE,
	status?: ConferenceStatus
) {
	const rows = await db
		.select()
		.from(conference)
		.where(status ? eq(conference.status, status) : undefined)
		.orderBy(desc(conference.startsAt), desc(conference.createdAt))
		.limit(limit + 1)
		.offset(offset);

	const hasMore = rows.length > limit;
	const conferences = rows.slice(0, limit);

	let unlockedIds = new Set<string>();
	if (user) {
		if (user.role === 'admin') {
			unlockedIds = new Set(conferences.map((c) => c.id));
		} else {
			const grants = await db
				.select({ conferenceId: accessGrant.conferenceId })
				.from(accessGrant)
				.where(eq(accessGrant.userId, user.id));
			unlockedIds = new Set(grants.map((g) => g.conferenceId));
		}
	}

	return {
		conferences: conferences.map((c) => ({ ...c, unlocked: unlockedIds.has(c.id) })),
		hasMore
	};
}
