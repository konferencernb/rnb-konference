import { error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { hasConferenceAccess } from '$lib/server/access';
import { db } from '$lib/server/db';
import { accessLog, conference } from '$lib/server/db/schema';
import { formatCustomerName } from '$lib/format-name';
import { buildPayment } from '$lib/server/payment';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, request, getClientAddress }) => {
	const [found] = await db
		.select()
		.from(conference)
		.where(and(eq(conference.id, params.id), isNull(conference.deactivatedAt)));

	if (!found) {
		error(404, 'Konference nenalezena');
	}

	const unlocked = await hasConferenceAccess(locals.user, found.id);

	if (locals.user?.role !== 'admin') {
		await db.insert(accessLog).values({
			conferenceId: found.id,
			userId: locals.user?.id,
			ipAddress: getClientAddress(),
			userAgent: request.headers.get('user-agent'),
			result: unlocked ? 'granted' : 'denied'
		});
	}

	// No login required to see the payment details — the QR code carries the
	// visitor's name as the recipient message when they're logged in. A
	// logged-out visitor gets a literal placeholder instead, telling them
	// what to fill in themselves — there's no name to pre-fill for them.
	// The variable symbol identifies the conference the payment is for, not
	// when it was made — so it's keyed on startsAt, not "today". A conference
	// still being prepared (startsAt not set yet) falls back to today's date;
	// it'll change once the admin fills in a real date, but there's nothing
	// else to key it on until then.
	const payment = !unlocked
		? await buildPayment({
				amount: found.price,
				recipientMessage: locals.user ? formatCustomerName(locals.user) : 'VAŠE JMÉNO A PŘÍJMENÍ',
				date: found.startsAt ?? new Date()
			})
		: null;

	return {
		payment,
		conference: unlocked
			? found
			: {
					id: found.id,
					title: found.title,
					description: found.description,
					price: found.price,
					status: found.status,
					startsAt: found.startsAt
				},
		unlocked
	};
};
