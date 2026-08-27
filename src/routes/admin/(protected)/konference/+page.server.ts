import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const conferences = await db
		.select()
		.from(conference)
		.orderBy(desc(conference.startsAt), desc(conference.createdAt));

	return { conferences };
};
