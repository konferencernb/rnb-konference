import { env } from '$env/dynamic/private';
import { logEmailAttempt } from '$lib/server/email-log';
import type { EmailLogType } from '$lib/server/db/schema';
import { escapeEmailText, renderEmailLayout } from '$lib/server/email-template';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MAX_RETRIES = 3;
// A 429's Retry-After can legitimately ask for minutes — honoring that would
// block whoever's waiting on this request (an admin's browser tab, or the
// next person in an import batch) far longer than makes sense. Past this,
// treat it as a failure instead of waiting it out.
const MAX_RETRY_AFTER_MS = 30_000;

// Client Credentials access tokens are valid ~60–90 minutes — cached and
// reused across sends instead of re-authenticating before every single
// email.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
	if (!env.MS_TENANT_ID || !env.MS_CLIENT_ID || !env.MS_CLIENT_SECRET) return null;

	if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
		return cachedToken.value;
	}

	let response: Response;
	try {
		response = await fetch(
			`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: env.MS_CLIENT_ID,
					client_secret: env.MS_CLIENT_SECRET,
					scope: 'https://graph.microsoft.com/.default',
					grant_type: 'client_credentials'
				}),
				signal: AbortSignal.timeout(10_000)
			}
		);
	} catch (error) {
		console.error(
			'MS Graph token request errored:',
			error instanceof Error ? error.message : error
		);
		return null;
	}

	if (!response.ok) {
		// Body isn't logged — never risk echoing the client secret back out.
		console.error('MS Graph token request failed with status', response.status);
		return null;
	}

	try {
		const data = (await response.json()) as { access_token: string; expires_in: number };
		cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
		return cachedToken.value;
	} catch (error) {
		console.error(
			'MS Graph token response unparseable:',
			error instanceof Error ? error.message : error
		);
		return null;
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Never throws — a failed send is reported back as `false` so a batch import
// can log it, count it, and move on to the next person instead of the whole
// request dying on one bad address. The outer try/catch is a backstop for
// anything unexpected in the loop below; every anticipated failure already
// returns on its own. Every attempt (success or failure, with the exact
// reason) is persisted via emailLog — see /admin/logy — since a swallowed
// failure that's only ever `console.error`'d is invisible to anyone but
// whoever happens to be tailing server logs at that moment.
async function sendGraphMail(
	type: EmailLogType,
	to: string,
	subject: string,
	html: string
): Promise<boolean> {
	const mailFrom = env.MAIL_FROM;
	if (!mailFrom) {
		const error = 'MAIL_FROM not configured';
		console.warn(error, '— skipping email to', to);
		await logEmailAttempt(type, to, false, error);
		return false;
	}

	let result: { success: boolean; error: string | null };
	try {
		result = await sendGraphMailAttempts(to, subject, html, mailFrom);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('Email send unexpected error:', to, message);
		result = { success: false, error: message };
	}

	await logEmailAttempt(type, to, result.success, result.error);
	return result.success;
}

async function sendGraphMailAttempts(
	to: string,
	subject: string,
	html: string,
	mailFrom: string
): Promise<{ success: boolean; error: string | null }> {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		const token = await getAccessToken();
		if (!token) {
			const error = 'Microsoft Graph not configured or token request failed';
			console.warn(error, '— skipping email to', to);
			return { success: false, error };
		}

		let response: Response;
		try {
			response = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(mailFrom)}/sendMail`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					message: {
						subject,
						body: { contentType: 'HTML', content: html },
						toRecipients: [{ emailAddress: { address: to } }]
					},
					saveToSentItems: true
				}),
				// Bounded so a stalled request can't hang the page/import behind
				// it indefinitely.
				signal: AbortSignal.timeout(15_000)
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('Email send errored:', to, message);
			return { success: false, error: message };
		}

		if (response.status === 202) {
			console.log('Email sent:', to, response.status);
			return { success: true, error: null };
		}

		if (response.status === 401 && attempt < MAX_RETRIES) {
			// The cached token may have just expired server-side — drop it and
			// get a fresh one on the next loop iteration.
			cachedToken = null;
			continue;
		}

		if (response.status === 429 && attempt < MAX_RETRIES) {
			const retryAfterMs = Number(response.headers.get('Retry-After') ?? '2') * 1000;
			if (retryAfterMs > MAX_RETRY_AFTER_MS) {
				const error = `Rate-limited past acceptable wait (Retry-After ${retryAfterMs}ms)`;
				console.error('Email send rate-limited past acceptable wait:', to, response.status);
				return { success: false, error };
			}
			await sleep(retryAfterMs);
			continue;
		}

		const reason =
			response.status === 403
				? 'Forbidden — check the app has Mail.Send consent for this mailbox'
				: response.status === 404
					? 'Not found — check MAIL_FROM is a real mailbox'
					: 'unexpected status';
		// The response body can carry a useful Graph error code/message (and
		// nothing sensitive — unlike the token endpoint above) — worth a best
		// effort read for the log even though it's discarded on the console.
		const bodyDetail = await response
			.text()
			.then((text) => text.slice(0, 500))
			.catch(() => null);
		const error = `HTTP ${response.status} — ${reason}${bodyDetail ? `: ${bodyDetail}` : ''}`;
		console.error('Email send failed:', to, response.status, reason);
		return { success: false, error };
	}

	const error = `Failed after ${MAX_RETRIES} retries`;
	console.error('Email send failed after retries:', to);
	return { success: false, error };
}

export async function sendAccessGrantedEmail(
	to: string,
	conferenceTitle: string,
	conferenceId: string
): Promise<boolean> {
	// Plain template, not resolve() — see the comment in invites.ts on why an
	// email URL can't use SvelteKit's request-relative path resolution.
	const conferenceUrl = `${env.ORIGIN}/konference/${conferenceId}`;
	const title = escapeEmailText(conferenceTitle);

	return sendGraphMail(
		'access_granted',
		to,
		`Přístup ke konferenci „${conferenceTitle}“`,
		renderEmailLayout({
			preheader: `Byl vám přidělen přístup ke konferenci „${conferenceTitle}“.`,
			heading: 'Máte přístup ke konferenci',
			bodyHtml: `
				<p style="margin: 0 0 14px;">Dobrý den,</p>
				<p style="margin: 0;">byl vám přidělen trvalý přístup ke konferenci <strong>„${title}“</strong> — živě i k pozdějšímu záznamu. Po přihlášení ji najdete ve svém přehledu konferencí.</p>
			`,
			ctaLabel: 'Otevřít konferenci',
			ctaUrl: conferenceUrl
		})
	);
}

export async function sendPasswordResetEmail(
	to: string,
	firstName: string | null,
	lastName: string | null,
	resetUrl: string
): Promise<boolean> {
	const fullName = [firstName, lastName].filter(Boolean).join(' ');
	const greeting = fullName ? `Dobrý den, ${fullName}` : 'Dobrý den';

	return sendGraphMail(
		'password_reset',
		to,
		'Obnovení hesla — Online konference Rehabilitační nemocnice Beroun',
		renderEmailLayout({
			preheader: 'Obnovte si heslo — odkaz platí 1 hodinu.',
			heading: 'Obnovení hesla',
			bodyHtml: `
				<p style="margin: 0 0 14px;">${escapeEmailText(greeting)},</p>
				<p style="margin: 0 0 14px;">požádali jste o obnovení hesla k účtu na platformě Online konference Rehabilitační nemocnice Beroun. Tlačítkem níže si nastavte nové heslo — odkaz je platný <strong>1 hodinu</strong>.</p>
				<p style="margin: 0;">Pokud jste o obnovení hesla nežádali, tento e-mail můžete ignorovat — vaše heslo zůstane beze změny.</p>
			`,
			ctaLabel: 'Nastavit nové heslo',
			ctaUrl: resetUrl
		})
	);
}

export async function sendInviteEmail(
	to: string,
	firstName: string | null,
	lastName: string | null,
	inviteUrl: string
): Promise<boolean> {
	const fullName = [firstName, lastName].filter(Boolean).join(' ');
	const greeting = fullName ? `Dobrý den, ${fullName}` : 'Dobrý den';

	return sendGraphMail(
		'invite',
		to,
		'Dokončete registraci k Rehabilitační nemocnice Beroun Online konference',
		renderEmailLayout({
			preheader: 'Dokončete registraci a nastavte si heslo — odkaz platí 7 dní.',
			heading: 'Dokončete registraci',
			bodyHtml: `
				<p style="margin: 0 0 14px;">${escapeEmailText(greeting)},</p>
				<p style="margin: 0 0 14px;">založili jsme vám účet na platformě Online konference Rehabilitační nemocnice Beroun. Pro dokončení registrace si tlačítkem níže nastavte heslo — odkaz je platný <strong>7 dní</strong>.</p>
				<p style="margin: 0;">Po dokončení se rovnou přihlásíte.</p>
			`,
			ctaLabel: 'Dokončit registraci',
			ctaUrl: inviteUrl
		})
	);
}
