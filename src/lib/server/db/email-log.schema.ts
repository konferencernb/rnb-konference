import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const emailLogType = ['invite', 'password_reset', 'access_granted'] as const;
export type EmailLogType = (typeof emailLogType)[number];

// One row per send attempt (not per logical email — a retried 401/429 still
// only counts once, since sendGraphMailAttempts only reports its final
// outcome). Recipient is stored as plain text rather than a userId reference:
// unlike accessLog this is a delivery record, not tied to who's logged in, and
// should survive a user being deleted later rather than going null on them.
export const emailLog = pgTable(
	'email_log',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		type: text('type', { enum: emailLogType }).notNull(),
		recipient: text('recipient').notNull(),
		success: boolean('success').notNull(),
		// Exact failure reason (HTTP status/body detail, network error message,
		// etc.) — null on a successful send.
		error: text('error'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('email_log_createdAt_idx').on(table.createdAt)]
);
