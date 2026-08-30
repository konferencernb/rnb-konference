import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { and, eq } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { user as userTable, userInvite } from '$lib/server/db/schema';
import { sendPasswordResetEmail } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	// Dev-only: baseURL is pinned to http://localhost:5173, so a phone or
	// other device on the same Wi-Fi hitting the dev server by its LAN IP
	// (e.g. http://192.168.1.23:5173) sends an Origin header that doesn't
	// match — better-auth's CSRF check then rejects sign-in with a 403 that
	// the UI shows as "wrong email or password". These patterns only widen
	// what's trusted for local network testing; never applied in production.
	...(dev && {
		trustedOrigins: ['http://192.168.*.*:5173', 'http://10.*.*.*:5173', 'http://172.*.*.*:5173']
	}),
	// Sign-in stays enabled (existing customers/admin still log in with
	// email+password); sign-up is disabled at the API level too, not just by
	// removing the /registrace page — customers are now only ever created via
	// an admin-sent invite (see $lib/server/invites.ts), never self-serve.
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
		sendResetPassword: async ({ user, token }) => {
			// The `user` this callback receives is typed from the base schema,
			// without additionalFields (firstName/lastName) — that augmentation
			// only applies to consumers of the *client's* inferred session type,
			// not to a callback living inside the same config that defines it.
			// Look the row up directly instead of casting.
			const [found] = await db.select().from(userTable).where(eq(userTable.id, user.id));

			// Plain template off `token`, not the `url` better-auth hands us here
			// (which points at its own /api/auth/reset-password/:token redirect
			// helper) — same reasoning as invites.ts: an email link is built as a
			// direct string, never via a request-relative helper, and here that
			// means going straight to our own page instead of better-auth's.
			const resetUrl = `${env.ORIGIN}/obnoveni-hesla/${token}`;
			await sendPasswordResetEmail(
				user.email,
				found?.firstName ?? null,
				found?.lastName ?? null,
				resetUrl
			);
		},
		// A customer can end up setting their password for the first time via
		// "Zapomenuté heslo" instead of the invite-completion link (e.g. they
		// lost the invite email) — better-auth's reset-password endpoint
		// happily creates the credential account and lets them sign in either
		// way, but knows nothing about our own status/registeredAt bookkeeping.
		// This keeps that bookkeeping correct regardless of which path they
		// used, and clears out the now-redundant invite token so it can't also
		// be completed later — completeInvite() would otherwise try to create
		// a second credential account for the same user and hit the unique
		// (issuer, accountId) index.
		onPasswordReset: async ({ user }) => {
			await db
				.update(userTable)
				.set({ status: 'active', registeredAt: new Date() })
				.where(and(eq(userTable.id, user.id), eq(userTable.status, 'invited')));
			await db.delete(userInvite).where(eq(userInvite.userId, user.id));
		}
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				defaultValue: 'user',
				input: false
			},
			firstName: {
				type: 'string',
				required: false,
				input: true
			},
			lastName: {
				type: 'string',
				required: false,
				input: true
			},
			// 'invited' accounts are created directly by an admin (see
			// /admin/uzivatele/new) before the customer has set a password —
			// this is what lets access get granted right away instead of
			// waiting on the invite email being opened. Only self-registration
			// (below) and the invite-completion flow ever set this; it's never
			// client-settable.
			status: {
				type: 'string',
				defaultValue: 'active',
				input: false
			},
			// When the account actually became usable: at signup time for a
			// normal self-registration (set by the hook below), or when an
			// invited customer finishes setting their password. Stays null for
			// an invited account that hasn't completed that yet.
			registeredAt: {
				type: 'date',
				required: false,
				input: false
			}
		}
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					return { data: { ...user, status: 'active', registeredAt: new Date() } };
				}
			}
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
