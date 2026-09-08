import { error, json } from '@sveltejs/kit';
import { validatePassword } from '$lib/password';
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const token = typeof body.token === 'string' ? body.token : '';
	const password = typeof body.password === 'string' ? body.password : '';

	if (!token || !password) error(400, 'Chybí token nebo heslo.');
	const passwordError = validatePassword(password);
	if (passwordError) error(400, passwordError);

	try {
		// Called directly on the server (not via HTTP), same as completeInvite()
		// in the invite-completion flow — this is also what lets our own
		// validatePassword() run first, since better-auth's endpoint only
		// checks length, not the uppercase/digit/special-character rule.
		await auth.api.resetPassword({ body: { token, newPassword: password } });
	} catch {
		error(400, 'Odkaz je neplatný nebo mu vypršela platnost.');
	}

	return json({ status: true });
};
