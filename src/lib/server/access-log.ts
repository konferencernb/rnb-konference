import { count, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessLog, conference, user } from '$lib/server/db/schema';

export async function getAccessStats() {
	const [{ granted }] = await db
		.select({ granted: count() })
		.from(accessLog)
		.where(eq(accessLog.result, 'granted'));

	const [{ denied }] = await db
		.select({ denied: count() })
		.from(accessLog)
		.where(eq(accessLog.result, 'denied'));

	return { granted, denied };
}

export async function listAccessLog(limit: number, offset = 0) {
	const rows = await db
		.select({
			id: accessLog.id,
			createdAt: accessLog.createdAt,
			ipAddress: accessLog.ipAddress,
			userAgent: accessLog.userAgent,
			result: accessLog.result,
			conferenceTitle: conference.title,
			userEmail: user.email
		})
		.from(accessLog)
		.innerJoin(conference, eq(accessLog.conferenceId, conference.id))
		.leftJoin(user, eq(accessLog.userId, user.id))
		.orderBy(desc(accessLog.createdAt))
		.limit(limit + 1)
		.offset(offset);

	const hasMore = rows.length > limit;

	return { entries: rows.slice(0, limit), hasMore };
}
