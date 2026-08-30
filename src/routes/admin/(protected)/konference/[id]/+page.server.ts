import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { conference, conferenceStatus } from '$lib/server/db/schema';
import { parsePragueDatetimeLocal } from '$lib/server/prague-time';
import { sanitizeDescription } from '$lib/server/sanitize';
import { getYoutubeVideoId } from '$lib/youtube';
import type { Actions } from './$types';

export const actions: Actions = {
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const descriptionRaw = formData.get('description')?.toString().trim();
		const description = descriptionRaw ? sanitizeDescription(descriptionRaw) : null;
		const priceRaw = formData.get('price')?.toString();
		const videoUrl = formData.get('videoUrl')?.toString().trim();
		const startsAtRaw = formData.get('startsAt')?.toString();
		const status = formData.get('status')?.toString();

		if (!title) return fail(400, { error: 'Název je povinný.' });
		if (!status || !conferenceStatus.includes(status as (typeof conferenceStatus)[number])) {
			return fail(400, { error: 'Neplatný stav.' });
		}
		if (!videoUrl && status !== 'upcoming') {
			return fail(400, {
				error: 'YouTube URL je povinné, pokud konference není ve stavu „Připravuje se“.'
			});
		}
		// See the identical check in konference/new/+page.server.ts for why —
		// the player has no error handling for an unparseable video id, so a
		// bad link would otherwise save fine and silently show a broken
		// player to paying customers.
		if (videoUrl && !getYoutubeVideoId(videoUrl)) {
			return fail(400, { error: 'Neplatná YouTube URL — zkontrolujte prosím odkaz.' });
		}
		const price = Number(priceRaw);
		if (!priceRaw || Number.isNaN(price) || price < 0) {
			return fail(400, { error: 'Cena musí být kladné číslo.' });
		}

		await db
			.update(conference)
			.set({
				title,
				description,
				price,
				videoUrl: videoUrl || null,
				status: status as (typeof conferenceStatus)[number],
				startsAt: startsAtRaw ? parsePragueDatetimeLocal(startsAtRaw) : null
			})
			.where(eq(conference.id, params.id));

		return { success: true };
	}
};
