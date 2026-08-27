import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	// Sign-in stays enabled (existing customers/admin still log in with
	// email+password); sign-up is disabled at the API level too, not just by
	// removing the /registrace page — customers are now only ever created via
	// an admin-sent invite (see $lib/server/invites.ts), never self-serve.
	emailAndPassword: { enabled: true, disableSignUp: true },
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
