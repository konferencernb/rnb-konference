import { desc, inArray, ne } from 'drizzle-orm';
import { formatCustomerName } from '$lib/format-name';
import { db } from '$lib/server/db';
import { accessGrant, user } from '$lib/server/db/schema';

export const CUSTOMER_PAGE_SIZE = 20;

export async function listCustomersPage(offset: number, limit: number = CUSTOMER_PAGE_SIZE) {
	const rows = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			status: user.status,
			createdAt: user.createdAt
		})
		.from(user)
		.where(ne(user.role, 'admin'))
		.orderBy(desc(user.createdAt))
		.limit(limit + 1)
		.offset(offset);

	const hasMore = rows.length > limit;
	const customers = rows.slice(0, limit);

	const grantCountByUser = new Map<string, number>();
	if (customers.length > 0) {
		const grants = await db
			.select({ userId: accessGrant.userId })
			.from(accessGrant)
			.where(
				inArray(
					accessGrant.userId,
					customers.map((c) => c.id)
				)
			);

		for (const grant of grants) {
			grantCountByUser.set(grant.userId, (grantCountByUser.get(grant.userId) ?? 0) + 1);
		}
	}

	return {
		customers: customers.map((c) => ({
			...c,
			displayName: formatCustomerName(c),
			grantCount: grantCountByUser.get(c.id) ?? 0
		})),
		hasMore
	};
}
