import { and, eq, isNull } from 'drizzle-orm';
import { read, utils } from 'xlsx';
import { db } from '$lib/server/db';
import { accessGrant, conference, user } from '$lib/server/db/schema';
import { sendAccessGrantedEmail } from '$lib/server/email';
import { createInvite } from '$lib/server/invites';

export type ImportRow = {
	firstName: string;
	lastName: string;
	email: string;
	conferenceName: string;
};

export type ImportSummary = {
	imported: number;
	emailsSent: number;
	emailsFailed: number;
	failedEmails: string[];
	errors: string[];
};

// Lets the review screen flag which rows are for a brand-new account (shown
// in red — not an error, just "this will create someone new and email them
// an invite", worth a second look before importing) versus an existing one.
export async function getExistingEmails(): Promise<string[]> {
	const rows = await db.select({ email: user.email }).from(user);
	return rows.map((row) => row.email);
}

// Shared by the Excel-import pages under /admin/konference/import and
// /admin/uzivatele/import — same tabulka, same semantics, so the parsing and
// batch-import logic lives here once instead of drifting apart in two
// near-identical +page.server.ts files.

export async function parseImportFile(
	file: File
): Promise<{ rows: ImportRow[] } | { error: string }> {
	let raw: Record<string, unknown>[];
	try {
		const workbook = read(await file.arrayBuffer(), { type: 'array' });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		raw = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
	} catch {
		return { error: 'Soubor se nepodařilo přečíst. Je to platný .xlsx/.csv?' };
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
		return { error: 'V souboru nejsou žádné řádky se jménem, příjmením nebo emailem.' };
	}

	return { rows };
}

// Looks the conference up by its exact (still-active) title, skips a grant
// that already exists instead of erroring on it (an admin re-running the same
// import shouldn't see "already exists" as a failure), and sends the same
// "access granted" email either way.
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
	if (existing) return { ok: true as const, emailSent: true };

	await db.insert(accessGrant).values({ userId, conferenceId: found.id, grantedBy });

	const [grantedUser] = await db.select().from(user).where(eq(user.id, userId));
	const emailSent = grantedUser
		? await sendAccessGrantedEmail(grantedUser.email, found.title, found.id)
		: false;

	return { ok: true as const, emailSent };
}

// Runs after the admin has reviewed (and possibly edited/removed rows from)
// the parsed list. Rows are one-per-(person, conference) — the same person
// can appear on several rows, one per conference they're getting access to —
// so this groups by email first: one createInvite (or, if that email already
// has an account, a lookup instead) per person, then one grantConferenceByTitle
// per row in that person's group.
//
// People are processed in small concurrent batches rather than either fully
// sequentially (slow — every email waits for the previous one to finish) or
// all at once (hundreds of simultaneous Graph API requests).
export async function importUsersFromRows(
	rows: ImportRow[],
	grantedBy: string
): Promise<ImportSummary> {
	const byEmail = new Map<string, ImportRow[]>();
	for (const row of rows) {
		const email = row.email.toLowerCase();
		const group = byEmail.get(email);
		if (group) group.push(row);
		else byEmail.set(email, [row]);
	}

	async function processPerson(email: string, group: ImportRow[]) {
		const { firstName, lastName } = group[0];
		const result = {
			imported: 0,
			emailsSent: 0,
			emailsFailed: 0,
			failedEmails: [] as string[],
			errors: [] as string[]
		};

		if (!firstName || !lastName || !email) {
			result.errors.push(
				`${firstName} ${lastName} ${email}`.trim() + ': chybí jméno, příjmení nebo email.'
			);
			return result;
		}

		let userId: string;
		const [existingUser] = await db.select().from(user).where(eq(user.email, email));
		if (existingUser) {
			userId = existingUser.id;
		} else {
			const created = await createInvite({ firstName, lastName, email });
			if ('error' in created) {
				result.errors.push(`${email}: ${created.error}`);
				return result;
			}
			userId = created.user.id;
			result.imported++;
			if (created.emailSent) result.emailsSent++;
			else {
				result.emailsFailed++;
				result.failedEmails.push(email);
			}
		}

		for (const row of group) {
			if (!row.conferenceName) continue;
			const grant = await grantConferenceByTitle(userId, row.conferenceName, grantedBy);
			if ('error' in grant) {
				result.errors.push(`${email}: ${grant.error}`);
			} else if (grant.emailSent) {
				result.emailsSent++;
			} else {
				result.emailsFailed++;
				if (!result.failedEmails.includes(email)) result.failedEmails.push(email);
			}
		}

		return result;
	}

	const BATCH_SIZE = 8;
	const entries = [...byEmail.entries()];

	let imported = 0;
	let emailsSent = 0;
	let emailsFailed = 0;
	const failedEmails: string[] = [];
	const errors: string[] = [];

	for (let i = 0; i < entries.length; i += BATCH_SIZE) {
		const batch = entries.slice(i, i + BATCH_SIZE);
		const batchResults = await Promise.all(
			batch.map(([email, group]) => processPerson(email, group))
		);
		for (const r of batchResults) {
			imported += r.imported;
			emailsSent += r.emailsSent;
			emailsFailed += r.emailsFailed;
			failedEmails.push(...r.failedEmails);
			errors.push(...r.errors);
		}
	}

	return { imported, emailsSent, emailsFailed, failedEmails, errors };
}
