import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { accessGrant } from '$lib/server/db/schema';

export async function hasConferenceAccess(
	user: { id: string; role?: string } | undefined,
	conferenceId: string
) {
	if (!user) return false;
	if (user.role === 'admin') return true;

	const [grant] = await db
		.select({ id: accessGrant.id })
		.from(accessGrant)
		.where(and(eq(accessGrant.userId, user.id), eq(accessGrant.conferenceId, conferenceId)))
		.limit(1);

	return Boolean(grant);
}
