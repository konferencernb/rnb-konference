import { fail, redirect } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { read, utils } from 'xlsx';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { accessGrant, conference, user } from '$lib/server/db/schema';
import { sendAccessGrantedEmail } from '$lib/server/email';
import { createInvite } from '$lib/server/invites';
import type { Actions, PageServerLoad } from './$types';

type ImportRow = { firstName: string; lastName: string; email: string; conferenceName: string };

export const load: PageServerLoad = async () => {
	const conferences = await db
		.select({ id: conference.id, title: conference.title })
		.from(conference)
		.where(isNull(conference.deactivatedAt))
		.orderBy(conference.title);

	return { conferences };
};

// Shared by the manual form and the bulk import below — looks the conference
// up by its exact (still-active) title, skips a grant that already exists
// instead of erroring on it (an admin re-running the same import shouldn't
// see "already exists" as a failure), and sends the same "access granted"
// email either way.
async function grantConferenceByTitle(userId: string, conferenceTitle: string, grantedBy: string) {
	const [found] = await db
		.select()
		.from(conference)
		.where(and(eq(conference.title, conferenceTitle), isNull(conference.deactivatedAt)));

	if (!found) return { error: `Konference „${conferenceTitle}“ nenalezena.` as const };

	const [existing] = await db
		.select({ id: accessGrant.id })
		.from(accessGrant)
		.where(and(eq(accessGrant.userId, userId), eq(accessGrant.conferenceId, found.id)));
	if (existing) return { ok: true as const };

	await db.insert(accessGrant).values({ userId, conferenceId: found.id, grantedBy });

	const [grantedUser] = await db.select().from(user).where(eq(user.id, userId));
	if (grantedUser) {
		await sendAccessGrantedEmail(grantedUser.email, found.title, found.id);
	}

	return { ok: true as const };
}

export const actions: Actions = {
	// Named (not `default`) — SvelteKit doesn't allow mixing a default action
	// with named ones in the same file, and parseImport/importUsers below
	// need to be named.
	invite: async ({ request, locals }) => {
		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString().trim();
		const lastName = formData.get('lastName')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const conferenceTitlesRaw = formData.get('conferenceTitles')?.toString();
		const conferenceTitles = conferenceTitlesRaw
			? (JSON.parse(conferenceTitlesRaw) as string[])
			: [];

		if (!firstName) return fail(400, { error: 'Jméno je povinné.' });
		if (!lastName) return fail(400, { error: 'Příjmení je povinné.' });
		if (!email) return fail(400, { error: 'Email je povinný.' });

		const result = await createInvite({ firstName, lastName, email });

		if ('error' in result) {
			return fail(400, { error: result.error });
		}

		for (const title of conferenceTitles) {
			await grantConferenceByTitle(result.user.id, title, locals.user!.id);
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
		// requiring the exact "Jméno" / "Příjmení" / "E-mail" / "Konference"
		// spelling.
		const rows: ImportRow[] = raw
			.map((row) => {
				const byKey = Object.fromEntries(
					Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])
				);
				return {
					firstName: String(byKey['jméno'] ?? byKey['jmeno'] ?? '').trim(),
					lastName: String(byKey['příjmení'] ?? byKey['prijmeni'] ?? '').trim(),
					email: String(byKey['e-mail'] ?? byKey['email'] ?? '').trim(),
					conferenceName: String(byKey['konference'] ?? '').trim()
				};
			})
			.filter((row) => row.firstName || row.lastName || row.email || row.conferenceName);

		if (rows.length === 0) {
			return fail(400, {
				importError: 'V souboru nejsou žádné řádky se jménem, příjmením nebo emailem.'
			});
		}

		return { importedRows: rows };
	},

	// Runs after the admin has reviewed (and possibly edited/removed rows
	// from) the parsed list. Rows are one-per-(person, conference) — the same
	// person can appear on several rows, one per conference they're getting
	// access to — so this groups by email first: one createInvite (or, if
	// that email already has an account, a lookup instead) per person, then
	// one grantConferenceByTitle per row in that person's group.
	importUsers: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = formData.get('rows')?.toString();
		const rows = raw ? (JSON.parse(raw) as ImportRow[]) : [];

		if (rows.length === 0) {
			return fail(400, { importError: 'Nejsou vybráni žádní uživatelé k importu.' });
		}

		const byEmail = new Map<string, ImportRow[]>();
		for (const row of rows) {
			const email = row.email.toLowerCase();
			const group = byEmail.get(email);
			if (group) group.push(row);
			else byEmail.set(email, [row]);
		}

		let imported = 0;
		const errors: string[] = [];

		for (const [email, group] of byEmail) {
			const { firstName, lastName } = group[0];
			if (!firstName || !lastName || !email) {
				errors.push(
					`${firstName} ${lastName} ${email}`.trim() + ': chybí jméno, příjmení nebo email.'
				);
				continue;
			}

			let userId: string;
			const [existingUser] = await db.select().from(user).where(eq(user.email, email));
			if (existingUser) {
				userId = existingUser.id;
			} else {
				const result = await createInvite({ firstName, lastName, email });
				if ('error' in result) {
					errors.push(`${email}: ${result.error}`);
					continue;
				}
				userId = result.user.id;
				imported++;
			}

			for (const row of group) {
				if (!row.conferenceName) continue;
				const grant = await grantConferenceByTitle(userId, row.conferenceName, locals.user!.id);
				if ('error' in grant) errors.push(`${email}: ${grant.error}`);
			}
		}

		return { imported, errors };
	}
};
