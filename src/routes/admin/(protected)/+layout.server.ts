import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session || locals.user?.role !== 'admin') {
		redirect(303, resolve('/admin'));
	}

	return { user: locals.user };
};
