import { error, json } from '@sveltejs/kit';
import { completeInvite } from '$lib/server/invites';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const token = typeof body.token === 'string' ? body.token : '';
	const password = typeof body.password === 'string' ? body.password : '';

	if (!token || !password) error(400, 'Chybí token nebo heslo.');
	if (password.length < 8) error(400, 'Heslo musí mít alespoň 8 znaků.');

	const result = await completeInvite(token, password);

	if ('error' in result) error(400, result.error);

	return json({ email: result.user.email });
};
