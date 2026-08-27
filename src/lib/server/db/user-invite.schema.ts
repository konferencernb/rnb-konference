import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

// One row per pending invite (see /admin/uzivatele/new): a single-use token
// with an expiry, used by the public "complete registration" page to find
// which invited `user` row the customer is setting a password for. Deleted
// once the invite is completed (or naturally left to expire).
export const userInvite = pgTable(
	'user_invite',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('user_invite_token_idx').on(table.token)]
);

export const userInviteRelations = relations(userInvite, ({ one }) => ({
	user: one(user, {
		fields: [userInvite.userId],
		references: [user.id]
	})
}));
