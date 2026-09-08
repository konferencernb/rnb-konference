import { getInviteByToken } from '$lib/server/invites';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const found = await getInviteByToken(params.token);

	if (!found) return { status: 'invalid' as const };
	if (found.expired) return { status: 'expired' as const };

	return {
		status: 'valid' as const,
		email: found.invitedUser.email,
		firstName: found.invitedUser.firstName
	};
};
