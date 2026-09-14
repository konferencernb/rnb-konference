import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessGrant, conference, type ConferenceStatus } from '$lib/server/db/schema';

export const CONFERENCE_PAGE_SIZE = 12;

export const conferenceSort = ['default', 'oldest', 'newest', 'purchased', 'unpurchased'] as const;
export type ConferenceSort = (typeof conferenceSort)[number];

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

// Backs the site-wide "live now" banner in the public layout — just enough to
// link to it, not the full row. Most recently started first, in the (rare)
// case more than one conference is live at once.
export async function getLiveConference() {
	const [live] = await db
		.select({ id: conference.id, title: conference.title })
		.from(conference)
		.where(and(eq(conference.status, 'live'), isNull(conference.deactivatedAt)))
		.orderBy(desc(conference.startsAt))
		.limit(1);

	return live ?? null;
}

export async function listConferencesPage(
	offset: number,
	user?: { id: string; role?: string },
	limit: number = CONFERENCE_PAGE_SIZE,
	status?: ConferenceStatus,
	sort: ConferenceSort = 'default'
) {
	const whereClause = and(
		isNull(conference.deactivatedAt),
		status ? eq(conference.status, status) : undefined
	);

	// "purchased"/"unpurchased" only mean something for a logged-in,
	// non-admin customer — an admin sees everything unlocked regardless of
	// their own access grants, so sorting by *their* grants wouldn't reflect
	// what the option promises. Every other case (anonymous, admin) falls
	// back to the default ordering below.
	const rows =
		(sort === 'purchased' || sort === 'unpurchased') && user && user.role !== 'admin'
			? await (async () => {
					const ownedRank = sql<number>`case when ${accessGrant.id} is null then 0 else 1 end`;
					const joined = await db
						.select({ conference, grantId: accessGrant.id })
						.from(conference)
						.leftJoin(
							accessGrant,
							and(eq(accessGrant.conferenceId, conference.id), eq(accessGrant.userId, user.id))
						)
						.where(whereClause)
						.orderBy(
							sort === 'purchased' ? desc(ownedRank) : asc(ownedRank),
							desc(conference.startsAt),
							desc(conference.createdAt)
						)
						.limit(limit + 1)
						.offset(offset);
					return joined.map((row) => row.conference);
				})()
			: await db
					.select()
					.from(conference)
					.where(whereClause)
					.orderBy(
						...(sort === 'oldest'
							? [asc(conference.startsAt), asc(conference.createdAt)]
							: [desc(conference.startsAt), desc(conference.createdAt)])
					)
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
