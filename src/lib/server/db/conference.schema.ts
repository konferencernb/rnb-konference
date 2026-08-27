import { relations } from 'drizzle-orm';
import {
	pgTable,
	text,
	integer,
	boolean,
	timestamp,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const conferenceStatus = ['upcoming', 'live', 'ended'] as const;
export type ConferenceStatus = (typeof conferenceStatus)[number];

export const conference = pgTable('conference', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	description: text('description'),
	price: integer('price').notNull(),
	videoUrl: text('video_url'),
	status: text('status', { enum: conferenceStatus }).notNull().default('upcoming'),
	startsAt: timestamp('starts_at'),
	// Soft-delete: set instead of actually deleting the row, so existing
	// access grants/watch history/logs referencing this conference are kept
	// intact. A deactivated conference is filtered out of every listing and
	// detail page across the app — the only way back is clearing this
	// directly in the database, there's no "reactivate" UI.
	deactivatedAt: timestamp('deactivated_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const accessGrant = pgTable(
	'access_grant',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		conferenceId: text('conference_id')
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade' }),
		grantedAt: timestamp('granted_at').defaultNow().notNull(),
		grantedBy: text('granted_by')
			.notNull()
			.references(() => user.id)
	},
	(table) => [
		uniqueIndex('access_grant_user_conference_uidx').on(table.userId, table.conferenceId),
		index('access_grant_userId_idx').on(table.userId),
		index('access_grant_conferenceId_idx').on(table.conferenceId)
	]
);

export const accessLogResult = ['granted', 'denied'] as const;
export type AccessLogResult = (typeof accessLogResult)[number];

export const accessLog = pgTable(
	'access_log',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conferenceId: text('conference_id')
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		result: text('result', { enum: accessLogResult }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('access_log_conferenceId_idx').on(table.conferenceId),
		index('access_log_createdAt_idx').on(table.createdAt)
	]
);

// One row per (conference, viewer) — upserted on every heartbeat sent while a
// customer has the watch page open, rather than one row per visit. That's
// what makes "celkem sledujících" a count of unique people (someone who
// closes and reopens the stream mid-broadcast still only counts once), while
// "aktuálně sledující" reads off lastSeenAt to see who's genuinely there
// right now.
export const watchSession = pgTable(
	'watch_session',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conferenceId: text('conference_id')
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
		lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
		liveWatchSeconds: integer('live_watch_seconds').default(0).notNull(),
		recordedWatchSeconds: integer('recorded_watch_seconds').default(0).notNull()
	},
	(table) => [
		uniqueIndex('watch_session_conference_user_uidx').on(table.conferenceId, table.userId),
		index('watch_session_conferenceId_idx').on(table.conferenceId)
	]
);

// One append-only row per heartbeat (as opposed to watchSession's single
// upserted row per viewer) — this is what lets us reconstruct concurrent
// viewers *over time* for the "Diváci v čase" chart. Using watchSession's
// firstSeenAt/lastSeenAt for that would be wrong: a viewer who watches live,
// leaves, and comes back days later for the recording would show as
// "present" for the entire gap in between.
export const watchHeartbeat = pgTable(
	'watch_heartbeat',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conferenceId: text('conference_id')
			.notNull()
			.references(() => conference.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		seenAt: timestamp('seen_at').defaultNow().notNull(),
		isLive: boolean('is_live').notNull()
	},
	(table) => [index('watch_heartbeat_conference_seenAt_idx').on(table.conferenceId, table.seenAt)]
);

export const conferenceRelations = relations(conference, ({ many }) => ({
	accessGrants: many(accessGrant),
	accessLogs: many(accessLog),
	watchSessions: many(watchSession),
	watchHeartbeats: many(watchHeartbeat)
}));

export const watchHeartbeatRelations = relations(watchHeartbeat, ({ one }) => ({
	user: one(user, {
		fields: [watchHeartbeat.userId],
		references: [user.id]
	}),
	conference: one(conference, {
		fields: [watchHeartbeat.conferenceId],
		references: [conference.id]
	})
}));

export const watchSessionRelations = relations(watchSession, ({ one }) => ({
	user: one(user, {
		fields: [watchSession.userId],
		references: [user.id]
	}),
	conference: one(conference, {
		fields: [watchSession.conferenceId],
		references: [conference.id]
	})
}));

export const accessGrantRelations = relations(accessGrant, ({ one }) => ({
	user: one(user, {
		fields: [accessGrant.userId],
		references: [user.id]
	}),
	conference: one(conference, {
		fields: [accessGrant.conferenceId],
		references: [conference.id]
	})
}));

export const accessLogRelations = relations(accessLog, ({ one }) => ({
	user: one(user, {
		fields: [accessLog.userId],
		references: [user.id]
	}),
	conference: one(conference, {
		fields: [accessLog.conferenceId],
		references: [conference.id]
	})
}));
