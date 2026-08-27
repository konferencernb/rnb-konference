import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessGrant, conference, type ConferenceStatus } from '$lib/server/db/schema';

export const CONFERENCE_PAGE_SIZE = 12;

// Total revenue across every access grant ever issued — each grant represents
// one customer paying the conference's price for access to it. Deliberately
// not filtered by deactivatedAt: deactivating a conference hides it going
// forward, it doesn't rewrite past financial totals.
export async function getRevenueTotal() {
	const [{ revenue }] = await db
		.select({ revenue: sql<string>`coalesce(sum(${conference.price}), 0)` })
		.from(accessGrant)
		.innerJoin(conference, eq(accessGrant.conferenceId, conference.id));

	return Number(revenue);
}

// Soft-delete: keeps the row (and everything referencing it — access grants,
// watch history, logs) but hides it from every listing/detail page. The only
// way back is the unlinked /admin/konference/delete page (see
// listDeactivatedConferences/restoreConference below) — there's no link to
// it from anywhere in the regular admin nav, on purpose.
export async function deactivateConference(id: string) {
	await db.update(conference).set({ deactivatedAt: new Date() }).where(eq(conference.id, id));
}

export async function restoreConference(id: string) {
	await db.update(conference).set({ deactivatedAt: null }).where(eq(conference.id, id));
}

// Everything currently soft-deleted, most recently deactivated first — feeds
// the hidden /admin/konference/delete restore page.
export async function listDeactivatedConferences() {
	return db
		.select()
		.from(conference)
		.where(isNotNull(conference.deactivatedAt))
		.orderBy(desc(conference.deactivatedAt));
}

export async function listConferencesPage(
	offset: number,
	user?: { id: string; role?: string },
	limit: number = CONFERENCE_PAGE_SIZE,
	status?: ConferenceStatus
) {
	const rows = await db
		.select()
		.from(conference)
		.where(
			and(isNull(conference.deactivatedAt), status ? eq(conference.status, status) : undefined)
		)
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
