import { env } from '$env/dynamic/private';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { sendInviteEmail } from '$lib/server/email';
import { db } from '$lib/server/db';
import { account, user, userInvite } from '$lib/server/db/schema';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInvite(input: { firstName: string; lastName: string; email: string }) {
	const [existing] = await db.select().from(user).where(eq(user.email, input.email));
	if (existing) return { error: 'Uživatel s tímto emailem už existuje.' as const };

	const name = `${input.firstName} ${input.lastName}`.trim();
	const [created] = await db
		.insert(user)
		.values({
			id: crypto.randomUUID(),
			name,
			firstName: input.firstName,
			lastName: input.lastName,
			email: input.email,
			emailVerified: false,
			role: 'user',
			status: 'invited',
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.returning();

	const token = crypto.randomUUID();
	await db.insert(userInvite).values({
		userId: created.id,
		token,
		expiresAt: new Date(Date.now() + INVITE_TTL_MS)
	});

	// A plain template, not resolve() — resolve() builds a path *relative* to
	// the current request's URL (SvelteKit's default `paths.relative`), which
	// is correct for an href rendered in a page but breaks for a URL that's
	// going into an email, where there's no "current page" to resolve against.
	const inviteUrl = `${env.ORIGIN}/dokonceni-registrace/${token}`;
	await sendInviteEmail(created.email, created.firstName, created.lastName, inviteUrl);

	return { user: created };
}

export async function getInviteByToken(token: string) {
	const [invite] = await db.select().from(userInvite).where(eq(userInvite.token, token));
	if (!invite) return null;
	if (invite.expiresAt < new Date()) return { invite, expired: true as const, invitedUser: null };

	const [invitedUser] = await db.select().from(user).where(eq(user.id, invite.userId));
	if (!invitedUser) return null;

	return { invite, expired: false as const, invitedUser };
}

export async function completeInvite(token: string, password: string) {
	const found = await getInviteByToken(token);
	if (!found) return { error: 'Odkaz je neplatný.' as const };
	if (found.expired) return { error: 'Platnost odkazu vypršela.' as const };

	const { invite, invitedUser } = found;

	await db.insert(account).values({
		id: crypto.randomUUID(),
		issuer: 'local:credential',
		accountId: invitedUser.id,
		providerId: 'credential',
		userId: invitedUser.id,
		password: await hashPassword(password),
		createdAt: new Date(),
		updatedAt: new Date()
	});

	await db
		.update(user)
		.set({ status: 'active', registeredAt: new Date() })
		.where(eq(user.id, invitedUser.id));

	await db.delete(userInvite).where(eq(userInvite.id, invite.id));

	return { user: invitedUser };
}
