import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { logEmailAttempt } from '$lib/server/email-log';
import type { EmailLogType } from '$lib/server/db/schema';
import { escapeEmailText, renderEmailLayout } from '$lib/server/email-template';

// Cached across calls (module-level, one per server process) rather than
// creating a fresh transport — and a fresh TCP/TLS handshake — on every
// single send. `pool: true` additionally lets nodemailer reuse the same
// handful of SMTP connections across sends instead of one-per-message.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
	if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
		return null;
	}

	if (transporter) {
		return transporter;
	}

	const port = Number(env.SMTP_PORT) || 587;

	transporter = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port,
		// Port 465 is implicit TLS; everything else (587, 25) negotiates TLS via
		// STARTTLS instead — nodemailer doesn't infer this from the port itself.
		secure: port === 465,
		auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },

		pool: true,
		maxConnections: 3,
		maxMessages: 100,

		// Bounded so a stalled connection can't hang the request behind it
		// indefinitely — same reasoning as every other outbound call in this
		// app that's bounded with a timeout.
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 30_000
	});

	return transporter;
}

// Never throws — a failed send is reported back as `false` so a batch import
// can log it, count it, and move on to the next person instead of the whole
// request dying on one bad address. Every attempt (success or failure, with
// the exact reason) is persisted via emailLog — see /admin/logy — since a
// swallowed failure that's only ever `console.error`'d is invisible to
// anyone but whoever happens to be tailing server logs at that moment.
async function sendSmtpMail(
	type: EmailLogType,
	to: string,
	subject: string,
	text: string,
	html: string
): Promise<boolean> {
	const transport = getTransport();

	if (!transport) {
		const error = 'SMTP not configured';
		console.warn(error, '— skipping email to', to);
		await logEmailAttempt(type, to, false, error);
		return false;
	}

	try {
		const startedAt = Date.now();

		console.log(`[EMAIL] Sending ${type} to ${to}`);

		const info = await transport.sendMail({
			from: env.SMTP_FROM,
			to,
			subject,
			text,
			html
		});

		const duration = Date.now() - startedAt;

		console.log(`[EMAIL] SMTP accepted ${type} to ${to} in ${duration} ms`, {
			messageId: info.messageId,
			accepted: info.accepted,
			rejected: info.rejected,
			response: info.response
		});

		await logEmailAttempt(type, to, true, null);
		return true;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		console.error(`[EMAIL] Send failed ${type} to ${to}:`, message);

		await logEmailAttempt(type, to, false, message);
		return false;
	}
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

	return sendSmtpMail(
		'access_granted',
		to,
		`Přístup ke konferenci „${conferenceTitle}“`,
		`Byl vám přidělen přístup ke konferenci „${conferenceTitle}“. Po přihlášení ji najdete zde: ${conferenceUrl}\n\nV případě problémů se obraťte na community@nember.cz.`,
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

	return sendSmtpMail(
		'password_reset',
		to,
		'Obnovení hesla — Online konference Rehabilitační Nemocnice Beroun',
		`${greeting},\n\npožádali jste o obnovení hesla. Nové heslo si nastavte na odkazu níže — platí 1 hodinu:\n\n${resetUrl}\n\nPokud jste o obnovení hesla nežádali, tento e-mail můžete ignorovat — vaše heslo zůstane beze změny.\n\nV případě problémů se obraťte na community@nember.cz.`,
		renderEmailLayout({
			preheader: 'Obnovte si heslo — odkaz platí 1 hodinu.',
			heading: 'Obnovení hesla',
			bodyHtml: `
				<p style="margin: 0 0 14px;">${escapeEmailText(greeting)},</p>
				<p style="margin: 0 0 14px;">požádali jste o obnovení hesla k účtu na platformě Online konference Rehabilitační Nemocnice Beroun. Tlačítkem níže si nastavte nové heslo — odkaz je platný <strong>1 hodinu</strong>.</p>
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

	return sendSmtpMail(
		'invite',
		to,
		'Dokončete registraci k Rehabilitační Nemocnice Beroun Online konference',
		`${greeting},\n\nzaložili jsme vám účet. Pro dokončení registrace si nastavte heslo na odkazu níže — platí 7 dní:\n\n${inviteUrl}\n\nPo dokončení se rovnou přihlásíte.\n\nV případě problémů se obraťte na community@nember.cz.`,
		renderEmailLayout({
			preheader: 'Dokončete registraci a nastavte si heslo — odkaz platí 7 dní.',
			heading: 'Dokončete registraci',
			bodyHtml: `
				<p style="margin: 0 0 14px;">${escapeEmailText(greeting)},</p>
				<p style="margin: 0 0 14px;">založili jsme vám účet na platformě Online konference Rehabilitační Nemocnice Beroun. Pro dokončení registrace si tlačítkem níže nastavte heslo — odkaz je platný <strong>7 dní</strong>.</p>
				<p style="margin: 0;">Po dokončení se rovnou přihlásíte.</p>
			`,
			ctaLabel: 'Dokončit registraci',
			ctaUrl: inviteUrl
		})
	);
}
