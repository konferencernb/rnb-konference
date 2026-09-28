import { and, eq, gte, lt, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activeViewer } from '$lib/server/db/schema';

// Same window as watch-tracking's ONLINE_THRESHOLD_SECONDS ("currently
// watching" for the admin's presence dot) — a bit more than one heartbeat
// interval, to tolerate a single missed beat before a device is considered
// gone rather than genuinely still there.
const ACTIVE_THRESHOLD_SECONDS = 40;

function activeSinceThreshold() {
	return new Date(Date.now() - ACTIVE_THRESHOLD_SECONDS * 1000);
}

// Records this device's heartbeat and reports whether *another* device of
// the same account is already active — the signal the heartbeat endpoint
// uses to block a second, concurrent device rather than the first one.
//
// "First" is decided by firstSeenAt, not by which heartbeat happens to land
// last: whichever device has been continuously active the longest keeps
// playing, and a newly-arriving device is the one that gets blocked. Without
// this, two devices whose heartbeats merely alternate being the most recent
// would flicker between blocking each other every ~15s.
export async function checkAndRecordActiveViewer(
	userId: string,
	deviceId: string,
	conferenceId: string,
	ipAddress: string | null
): Promise<{ blocked: boolean }> {
	const [existing] = await db
		.select({ lastSeenAt: activeViewer.lastSeenAt })
		.from(activeViewer)
		.where(and(eq(activeViewer.userId, userId), eq(activeViewer.deviceId, deviceId)));

	const now = new Date();
	// A gap longer than the threshold means this device went quiet and is
	// only now reconnecting — treated as a new viewing streak (see the
	// comment on activeViewer.firstSeenAt), not a continuation of the old one.
	const isContinuation =
		existing && now.getTime() - existing.lastSeenAt.getTime() <= ACTIVE_THRESHOLD_SECONDS * 1000;

	const [mine] = await db
		.insert(activeViewer)
		.values({ userId, deviceId, conferenceId, ipAddress, firstSeenAt: now, lastSeenAt: now })
		.onConflictDoUpdate({
			target: [activeViewer.userId, activeViewer.deviceId],
			set: {
				conferenceId,
				ipAddress,
				lastSeenAt: now,
				...(isContinuation ? {} : { firstSeenAt: now })
			}
		})
		.returning({ firstSeenAt: activeViewer.firstSeenAt });

	const [other] = await db
		.select({ id: activeViewer.id })
		.from(activeViewer)
		.where(
			and(
				eq(activeViewer.userId, userId),
				ne(activeViewer.deviceId, deviceId),
				gte(activeViewer.lastSeenAt, activeSinceThreshold()),
				lt(activeViewer.firstSeenAt, mine.firstSeenAt)
			)
		)
		.limit(1);

	return { blocked: !!other };
}
