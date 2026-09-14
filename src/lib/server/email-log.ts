import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { emailLog, type EmailLogType } from '$lib/server/db/schema';

// Fire-and-forget from the caller's perspective (email.ts awaits it, but a
// failure here must never turn a merely-unlogged email send into a thrown
// error) — logging the attempt is a side effect, not something the send
// itself should fail over.
export async function logEmailAttempt(
	type: EmailLogType,
	recipient: string,
	success: boolean,
	error: string | null
) {
	try {
		await db.insert(emailLog).values({ type, recipient, success, error });
	} catch (err) {
		console.error('Failed to write email log entry:', err instanceof Error ? err.message : err);
	}
}

export async function listEmailLog(limit: number, offset = 0) {
	const rows = await db
		.select()
		.from(emailLog)
		.orderBy(desc(emailLog.createdAt))
		.limit(limit + 1)
		.offset(offset);

	const hasMore = rows.length > limit;

	return { entries: rows.slice(0, limit), hasMore };
}
