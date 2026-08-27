import { and, count, desc, eq, gt, gte, sql } from 'drizzle-orm';
import { formatCustomerName } from '$lib/format-name';
import { db } from '$lib/server/db';
import { accessGrant, user, watchHeartbeat, watchSession } from '$lib/server/db/schema';

export const viewerStatuses = ['online', 'watched', 'never', 'invited'] as const;
export type ViewerStatus = (typeof viewerStatuses)[number];

// How often the client is expected to ping while the watch page is open.
export const HEARTBEAT_INTERVAL_SECONDS = 15;

// A viewer counts as "currently watching" if their last heartbeat landed
// within this window — a bit more than one interval, to tolerate a single
// missed beat before we consider them gone.
const ONLINE_THRESHOLD_SECONDS = 40;

// Upper bound on how much watch time a single heartbeat can add. Without
// this, a laptop waking from sleep (or a long-suspended background tab)
// would get credited with the whole gap as watch time.
const MAX_INCREMENT_SECONDS = HEARTBEAT_INTERVAL_SECONDS * 2;

export async function recordHeartbeat(conferenceId: string, userId: string, isLive: boolean) {
	const [existing] = await db
		.select({ lastSeenAt: watchSession.lastSeenAt })
		.from(watchSession)
		.where(and(eq(watchSession.conferenceId, conferenceId), eq(watchSession.userId, userId)));

	const now = new Date();
	const increment = existing
		? Math.min(
				MAX_INCREMENT_SECONDS,
				Math.max(0, Math.round((now.getTime() - existing.lastSeenAt.getTime()) / 1000))
			)
		: HEARTBEAT_INTERVAL_SECONDS;

	await db
		.insert(watchSession)
		.values({
			conferenceId,
			userId,
			firstSeenAt: now,
			lastSeenAt: now,
			liveWatchSeconds: isLive ? increment : 0,
			recordedWatchSeconds: isLive ? 0 : increment
		})
		.onConflictDoUpdate({
			target: [watchSession.conferenceId, watchSession.userId],
			set: {
				lastSeenAt: now,
				liveWatchSeconds: isLive
					? sql`${watchSession.liveWatchSeconds} + ${increment}`
					: watchSession.liveWatchSeconds,
				recordedWatchSeconds: isLive
					? watchSession.recordedWatchSeconds
					: sql`${watchSession.recordedWatchSeconds} + ${increment}`
			}
		});

	await db.insert(watchHeartbeat).values({ conferenceId, userId, seenAt: now, isLive });
}

function onlineSinceThreshold() {
	return new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
}

export async function getWatchStats(conferenceId: string) {
	const onlineSince = onlineSinceThreshold();

	const [{ currentlyWatching }] = await db
		.select({ currentlyWatching: count() })
		.from(watchSession)
		.where(
			and(eq(watchSession.conferenceId, conferenceId), gte(watchSession.lastSeenAt, onlineSince))
		);

	const [{ totalViewers, totalWatchSeconds, watchedLiveCount, watchedRecordedCount }] = await db
		.select({
			totalViewers: count(),
			totalWatchSeconds: sql<string>`coalesce(sum(${watchSession.liveWatchSeconds} + ${watchSession.recordedWatchSeconds}), 0)`,
			watchedLiveCount: sql<number>`count(*) filter (where ${watchSession.liveWatchSeconds} > 0)`,
			watchedRecordedCount: sql<number>`count(*) filter (where ${watchSession.recordedWatchSeconds} > 0)`
		})
		.from(watchSession)
		.where(eq(watchSession.conferenceId, conferenceId));

	return {
		currentlyWatching,
		totalViewers,
		totalWatchSeconds: Number(totalWatchSeconds),
		watchedLiveCount: Number(watchedLiveCount),
		watchedRecordedCount: Number(watchedRecordedCount)
	};
}

function mapViewerRows(
	rows: {
		userId: string;
		name: string;
		firstName: string | null;
		lastName: string | null;
		email: string;
		liveWatchSeconds: number;
		recordedWatchSeconds: number;
	}[]
) {
	return rows.map((row) => ({
		userId: row.userId,
		displayName: formatCustomerName(row),
		email: row.email,
		watchSeconds: row.liveWatchSeconds + row.recordedWatchSeconds,
		liveWatchSeconds: row.liveWatchSeconds,
		recordedWatchSeconds: row.recordedWatchSeconds
	}));
}

export async function getCurrentViewers(conferenceId: string) {
	const onlineSince = onlineSinceThreshold();

	const rows = await db
		.select({
			userId: watchSession.userId,
			name: user.name,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			liveWatchSeconds: watchSession.liveWatchSeconds,
			recordedWatchSeconds: watchSession.recordedWatchSeconds
		})
		.from(watchSession)
		.innerJoin(user, eq(watchSession.userId, user.id))
		.where(
			and(eq(watchSession.conferenceId, conferenceId), gte(watchSession.lastSeenAt, onlineSince))
		)
		.orderBy(desc(watchSession.lastSeenAt));

	return mapViewerRows(rows);
}

export async function getLiveViewers(conferenceId: string) {
	const rows = await db
		.select({
			userId: watchSession.userId,
			name: user.name,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			liveWatchSeconds: watchSession.liveWatchSeconds
		})
		.from(watchSession)
		.innerJoin(user, eq(watchSession.userId, user.id))
		.where(and(eq(watchSession.conferenceId, conferenceId), gt(watchSession.liveWatchSeconds, 0)))
		.orderBy(desc(watchSession.liveWatchSeconds));

	return rows.map((row) => ({
		userId: row.userId,
		displayName: formatCustomerName(row),
		email: row.email,
		liveWatchSeconds: row.liveWatchSeconds
	}));
}

// Everyone who *has access* to the conference (not just those who've watched)
// — grant, name/email, whether they've ever watched, and whether they're
// online right now. This is what "celkem sledujících" shows: a full roster
// against the expected audience, with red/gray/green telling apart the three
// states a grant can be in.
export async function getAllExpectedViewersWithStatus(conferenceId: string) {
	const onlineSince = onlineSinceThreshold();

	const rows = await db
		.select({
			userId: user.id,
			name: user.name,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			registrationStatus: user.status,
			liveWatchSeconds: watchSession.liveWatchSeconds,
			recordedWatchSeconds: watchSession.recordedWatchSeconds,
			lastSeenAt: watchSession.lastSeenAt
		})
		.from(accessGrant)
		.innerJoin(user, eq(accessGrant.userId, user.id))
		.leftJoin(
			watchSession,
			and(
				eq(watchSession.conferenceId, accessGrant.conferenceId),
				eq(watchSession.userId, accessGrant.userId)
			)
		)
		.where(eq(accessGrant.conferenceId, conferenceId));

	const statusRank: Record<ViewerStatus, number> = { online: 0, watched: 1, invited: 2, never: 3 };

	return rows
		.map((row) => {
			// An invited (not-yet-registered) account can't possibly have
			// watched anything — it takes priority over the watch-derived
			// states rather than just falling out as "never".
			if (row.registrationStatus === 'invited') {
				return {
					userId: row.userId,
					displayName: formatCustomerName(row),
					email: row.email,
					watchSeconds: 0,
					status: 'invited' as ViewerStatus
				};
			}

			const hasWatched = row.lastSeenAt !== null;
			const isOnline = hasWatched && row.lastSeenAt! >= onlineSince;
			const status: ViewerStatus = isOnline ? 'online' : hasWatched ? 'watched' : 'never';

			return {
				userId: row.userId,
				displayName: formatCustomerName(row),
				email: row.email,
				watchSeconds: (row.liveWatchSeconds ?? 0) + (row.recordedWatchSeconds ?? 0),
				status
			};
		})
		.sort((a, b) => statusRank[a.status] - statusRank[b.status]);
}

// Distinct-viewer counts over time, reconstructed from individual heartbeat
// events (not from watchSession's cumulative rows — see the comment on
// watchHeartbeat for why that distinction matters here).
//
// The timeline always runs from the first heartbeat through *now* — not just
// through the last bucket that had activity — with gaps filled in as zero.
// Otherwise a chart checked well after everyone left would still show its
// last real point (e.g. "1 viewer") as if that were still current, instead
// of the drop back to 0. The bucket width adapts to the total span so a
// conference watched on and off over days doesn't return thousands of points.
export async function getViewerTimeline(conferenceId: string, options?: { isLive?: boolean }) {
	const scope =
		options?.isLive === undefined
			? eq(watchHeartbeat.conferenceId, conferenceId)
			: and(
					eq(watchHeartbeat.conferenceId, conferenceId),
					eq(watchHeartbeat.isLive, options.isLive)
				);

	const [{ minSeenAt }] = await db
		.select({ minSeenAt: sql<string | null>`min(${watchHeartbeat.seenAt})` })
		.from(watchHeartbeat)
		.where(scope);

	if (!minSeenAt) return [];

	const startMs = new Date(minSeenAt).getTime();
	const nowMs = Date.now();
	const targetPoints = 180;
	const oneMinuteMs = 60_000;
	const bucketMs = Math.max(
		oneMinuteMs,
		Math.ceil(Math.max(oneMinuteMs, nowMs - startMs) / targetPoints / oneMinuteMs) * oneMinuteMs
	);
	const bucketSeconds = bucketMs / 1000;

	const bucketExpr = sql`to_timestamp(floor(extract(epoch from ${watchHeartbeat.seenAt}) / ${bucketSeconds}) * ${bucketSeconds})`;

	// Group/order by the output alias rather than repeating bucketExpr: each
	// repetition binds its own copy of the $bucketSeconds parameters, and
	// Postgres only recognizes a GROUP BY expression as matching the SELECT
	// list by exact parse-tree identity — different parameter instances (even
	// with identical values) count as different expressions and it rejects
	// the query ("column must appear in the GROUP BY clause").
	const rows = await db
		.select({
			bucket: bucketExpr.as('bucket'),
			viewers: sql<number>`count(distinct ${watchHeartbeat.userId})`
		})
		.from(watchHeartbeat)
		.where(scope)
		.groupBy(sql`bucket`)
		.orderBy(sql`bucket`);

	const countByBucket = new Map<number, number>();
	for (const row of rows) {
		countByBucket.set(new Date(row.bucket as unknown as string).getTime(), Number(row.viewers));
	}

	const firstBucket = Math.floor(startMs / bucketMs) * bucketMs;
	const lastBucket = Math.floor(nowMs / bucketMs) * bucketMs;

	const timeline: { bucket: Date; viewers: number }[] = [];
	for (let t = firstBucket; t <= lastBucket; t += bucketMs) {
		timeline.push({ bucket: new Date(t), viewers: countByBucket.get(t) ?? 0 });
	}

	return timeline;
}
