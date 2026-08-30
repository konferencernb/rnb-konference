import { json } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const email = typeof body.email === 'string' ? body.email : '';

	if (email) {
		// better-auth's own requestPasswordReset already responds identically
		// whether or not the email matches an account (anti-enumeration) — the
		// try/catch here is just so a malformed address can't surface an error
		// either and leak the same information a different way.
		await auth.api.requestPasswordReset({ body: { email } }).catch(() => {});
	}

	return json({ status: true });
};
