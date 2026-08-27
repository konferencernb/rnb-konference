import { error, fail } from '@sveltejs/kit';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { formatCustomerName } from '$lib/format-name';
import { db } from '$lib/server/db';
import { accessGrant, conference, user } from '$lib/server/db/schema';
import { sendAccessGrantedEmail } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const grantRows = await db
		.select({
			id: accessGrant.id,
			grantedAt: accessGrant.grantedAt,
			userId: user.id,
			userEmail: user.email,
			userName: user.name,
			userFirstName: user.firstName,
			userLastName: user.lastName,
			userStatus: user.status
		})
		.from(accessGrant)
		.innerJoin(user, eq(accessGrant.userId, user.id))
		.where(eq(accessGrant.conferenceId, params.id));

	const grants = grantRows.map((grant) => ({
		id: grant.id,
		grantedAt: grant.grantedAt,
		userId: grant.userId,
		userEmail: grant.userEmail,
		userStatus: grant.userStatus,
		userDisplayName: formatCustomerName({
			name: grant.userName,
			firstName: grant.userFirstName,
			lastName: grant.userLastName,
			email: grant.userEmail
		})
	}));

	const grantedUserIds = new Set(grants.map((g) => g.userId));

	const customerRows = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			firstName: user.firstName,
			lastName: user.lastName
		})
		.from(user)
		.where(ne(user.role, 'admin'))
		.orderBy(desc(user.createdAt));

	const customers = customerRows.map((customer) => ({
		id: customer.id,
		email: customer.email,
		displayName: formatCustomerName(customer)
	}));

	const availableCustomers = customers.filter((c) => !grantedUserIds.has(c.id));

	return { grants, availableCustomers };
};

export const actions: Actions = {
	grantAccess: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) return fail(400, { grantError: 'Vyberte zákazníka.' });

		const [foundUser] = await db.select().from(user).where(eq(user.id, userId));
		if (!foundUser) return fail(400, { grantError: 'Uživatel nenalezen.' });

		const [found] = await db
			.select()
			.from(conference)
			.where(and(eq(conference.id, params.id), isNull(conference.deactivatedAt)));
		if (!found) error(404, 'Konference nenalezena');

		await db
			.insert(accessGrant)
			.values({
				userId,
				conferenceId: params.id,
				grantedBy: locals.user!.id
			})
			.onConflictDoNothing();

		await sendAccessGrantedEmail(foundUser.email, found.title);

		return { granted: true };
	},

	revokeAccess: async ({ request, params }) => {
		const formData = await request.formData();
		const grantId = formData.get('grantId')?.toString();

		if (!grantId) return fail(400, { grantError: 'Chybí id přístupu.' });

		await db
			.delete(accessGrant)
			.where(and(eq(accessGrant.id, grantId), eq(accessGrant.conferenceId, params.id)));

		return { revoked: true };
	}
};
