import { fail } from '@sveltejs/kit';
import { isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { conference } from '$lib/server/db/schema';
import {
	getExistingEmails,
	importUsersFromRows,
	parseImportFile,
	type ImportRow
} from '$lib/server/user-import';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [conferences, existingEmails] = await Promise.all([
		db
			.select({ id: conference.id, title: conference.title })
			.from(conference)
			.where(isNull(conference.deactivatedAt))
			.orderBy(conference.title),
		getExistingEmails()
	]);

	return { conferences, existingEmails };
};

export const actions: Actions = {
	// Only reads the file and hands back what it found — nothing is created
	// yet, so a bad header row or a typo an admin wants to fix first never
	// touches the database. importUsers (below) does the actual creating,
	// once the admin has reviewed/edited the parsed rows client-side.
	parseImport: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { importError: 'Nahrajte prosím soubor.' });
		}

		const result = await parseImportFile(file);
		if ('error' in result) return fail(400, { importError: result.error });

		return { importedRows: result.rows };
	},

	importUsers: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = formData.get('rows')?.toString();
		const rows = raw ? (JSON.parse(raw) as ImportRow[]) : [];

		if (rows.length === 0) {
			return fail(400, { importError: 'Nejsou vybráni žádní uživatelé k importu.' });
		}

		return await importUsersFromRows(rows, locals.user!.id);
	}
};
