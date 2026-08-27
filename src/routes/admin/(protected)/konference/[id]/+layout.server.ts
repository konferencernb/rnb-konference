import { error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const [found] = await db
		.select()
		.from(conference)
		.where(and(eq(conference.id, params.id), isNull(conference.deactivatedAt)));

	if (!found) {
		error(404, 'Konference nenalezena');
	}

	return { conference: found };
};
