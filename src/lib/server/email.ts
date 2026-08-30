import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { escapeEmailText, renderEmailLayout } from '$lib/server/email-template';

function getTransport() {
	if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
		return null;
	}

	const port = Number(env.SMTP_PORT) || 587;

	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port,
		// Port 465 is implicit TLS; everything else (587, 25) negotiates TLS via
		// STARTTLS instead — nodemailer doesn't infer this from the port itself.
		secure: port === 465,
		auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
	});
}

export async function sendAccessGrantedEmail(
	to: string,
	conferenceTitle: string,
	conferenceId: string
) {
	const transport = getTransport();

	if (!transport) {
		console.warn('SMTP not configured — skipping access-granted email to', to);
		return;
	}

	// Plain template, not resolve() — see the comment in invites.ts on why an
	// email URL can't use SvelteKit's request-relative path resolution.
	const conferenceUrl = `${env.ORIGIN}/konference/${conferenceId}`;
	const title = escapeEmailText(conferenceTitle);

	await transport.sendMail({
		from: env.SMTP_FROM,
		to,
		subject: `Přístup ke konferenci „${conferenceTitle}“`,
		text: `Byl vám přidělen přístup ke konferenci „${conferenceTitle}“. Po přihlášení ji najdete zde: ${conferenceUrl}\n\nV případě problémů se obraťte na community@nember.cz.`,
		html: renderEmailLayout({
			preheader: `Byl vám přidělen přístup ke konferenci „${conferenceTitle}“.`,
			heading: 'Máte přístup ke konferenci',
			bodyHtml: `
				<p style="margin: 0 0 14px;">Dobrý den,</p>
				<p style="margin: 0;">byl vám přidělen trvalý přístup ke konferenci <strong>„${title}“</strong> — živě i k pozdějšímu záznamu. Po přihlášení ji najdete ve svém přehledu konferencí.</p>
			`,
			ctaLabel: 'Otevřít konferenci',
			ctaUrl: conferenceUrl
		})
	});
}

export async function sendPasswordResetEmail(
	to: string,
	firstName: string | null,
	lastName: string | null,
	resetUrl: string
) {
	const transport = getTransport();
	const fullName = [firstName, lastName].filter(Boolean).join(' ');
	const greeting = fullName ? `Dobrý den, ${fullName}` : 'Dobrý den';

	if (!transport) {
		console.warn('SMTP not configured — skipping password-reset email to', to);
		return;
	}

	await transport.sendMail({
		from: env.SMTP_FROM,
		to,
		subject: 'Obnovení hesla — Online konference Nemocnice Beroun',
		text: `${greeting},\n\npožádali jste o obnovení hesla. Nové heslo si nastavte na odkazu níže — platí 1 hodinu:\n\n${resetUrl}\n\nPokud jste o obnovení hesla nežádali, tento e-mail můžete ignorovat — vaše heslo zůstane beze změny.\n\nV případě problémů se obraťte na community@nember.cz.`,
		html: renderEmailLayout({
			preheader: 'Obnovte si heslo — odkaz platí 1 hodinu.',
			heading: 'Obnovení hesla',
			bodyHtml: `
				<p style="margin: 0 0 14px;">${escapeEmailText(greeting)},</p>
				<p style="margin: 0 0 14px;">požádali jste o obnovení hesla k účtu na platformě Online konference Nemocnice Beroun. Tlačítkem níže si nastavte nové heslo — odkaz je platný <strong>1 hodinu</strong>.</p>
				<p style="margin: 0;">Pokud jste o obnovení hesla nežádali, tento e-mail můžete ignorovat — vaše heslo zůstane beze změny.</p>
			`,
			ctaLabel: 'Nastavit nové heslo',
			ctaUrl: resetUrl
		})
	});
}

export async function sendInviteEmail(
	to: string,
	firstName: string | null,
	lastName: string | null,
	inviteUrl: string
) {
	const transport = getTransport();
	const fullName = [firstName, lastName].filter(Boolean).join(' ');
	const greeting = fullName ? `Dobrý den, ${fullName}` : 'Dobrý den';

	if (!transport) {
		console.warn('SMTP not configured — skipping invite email to', to);
		return;
	}

	await transport.sendMail({
		from: env.SMTP_FROM,
		to,
		subject: 'Dokončete registraci k Nemocnice Beroun Online konference',
		text: `${greeting},\n\nzaložili jsme vám účet. Pro dokončení registrace si nastavte heslo na odkazu níže — platí 7 dní:\n\n${inviteUrl}\n\nPo dokončení se rovnou přihlásíte.\n\nV případě problémů se obraťte na community@nember.cz.`,
		html: renderEmailLayout({
			preheader: 'Dokončete registraci a nastavte si heslo — odkaz platí 7 dní.',
			heading: 'Dokončete registraci',
			bodyHtml: `
				<p style="margin: 0 0 14px;">${escapeEmailText(greeting)},</p>
				<p style="margin: 0 0 14px;">založili jsme vám účet na platformě Online konference Nemocnice Beroun. Pro dokončení registrace si tlačítkem níže nastavte heslo — odkaz je platný <strong>7 dní</strong>.</p>
				<p style="margin: 0;">Po dokončení se rovnou přihlásíte.</p>
			`,
			ctaLabel: 'Dokončit registraci',
			ctaUrl: inviteUrl
		})
	});
}
