import { fail, redirect } from '@sveltejs/kit';
import { read, utils } from 'xlsx';
import { resolve } from '$app/paths';
import { createInvite } from '$lib/server/invites';
import type { Actions } from './$types';

type ImportRow = { firstName: string; lastName: string; email: string };

export const actions: Actions = {
	// Named (not `default`) — SvelteKit doesn't allow mixing a default action
	// with named ones in the same file, and parseImport/importUsers below
	// need to be named.
	invite: async ({ request }) => {
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
	},

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

		let raw: Record<string, unknown>[];
		try {
			const workbook = read(await file.arrayBuffer(), { type: 'array' });
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			raw = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
		} catch {
			return fail(400, { importError: 'Soubor se nepodařilo přečíst. Je to platný .xlsx/.csv?' });
		}

		// Header text is whatever the admin's template happens to say — match
		// loosely (trimmed, lowercased, diacritics optional) rather than
		// requiring the exact "Jméno" / "Příjmení" / "E-mail" spelling.
		const rows: ImportRow[] = raw
			.map((row) => {
				const byKey = Object.fromEntries(
					Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])
				);
				return {
					firstName: String(byKey['jméno'] ?? byKey['jmeno'] ?? '').trim(),
					lastName: String(byKey['příjmení'] ?? byKey['prijmeni'] ?? '').trim(),
					email: String(byKey['e-mail'] ?? byKey['email'] ?? '').trim()
				};
			})
			.filter((row) => row.firstName || row.lastName || row.email);

		if (rows.length === 0) {
			return fail(400, {
				importError: 'V souboru nejsou žádné řádky se jménem, příjmením nebo emailem.'
			});
		}

		return { importedRows: rows };
	},

	// Runs after the admin has reviewed (and possibly edited/removed rows
	// from) the parsed list — one createInvite per row, same as the manual
	// single-user form above, so an imported user goes through the exact
	// same invite-email path either way.
	importUsers: async ({ request }) => {
		const formData = await request.formData();
		const raw = formData.get('rows')?.toString();
		const rows = raw ? (JSON.parse(raw) as ImportRow[]) : [];

		if (rows.length === 0) {
			return fail(400, { importError: 'Nejsou vybráni žádní uživatelé k importu.' });
		}

		let imported = 0;
		const errors: string[] = [];

		for (const row of rows) {
			if (!row.firstName || !row.lastName || !row.email) {
				errors.push(`${row.firstName} ${row.lastName} ${row.email}`.trim() + ': chybí údaj.');
				continue;
			}

			const result = await createInvite(row);
			if ('error' in result) {
				errors.push(`${row.email}: ${result.error}`);
			} else {
				imported++;
			}
		}

		return { imported, errors };
	}
};
