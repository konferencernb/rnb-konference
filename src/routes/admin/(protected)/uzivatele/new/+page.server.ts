import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { createInvite } from '$lib/server/invites';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString().trim();
		const lastName = formData.get('lastName')?.toString().trim();
		const email = formData.get('email')?.toString().trim();

		if (!firstName) return fail(400, { error: 'Jméno je povinné.' });
		if (!lastName) return fail(400, { error: 'Příjmení je povinné.' });
		if (!email) return fail(400, { error: 'Email je povinný.' });

		const result = await createInvite({ firstName, lastName, email });

		if ('error' in result) {
			return fail(400, { error: result.error });
		}

		redirect(303, resolve('/admin/(protected)/uzivatele/[id]', { id: result.user.id }));
	}
};
