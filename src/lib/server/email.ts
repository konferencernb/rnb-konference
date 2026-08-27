import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

function getTransport() {
	if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
		return null;
	}

	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT) || 587,
		auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
	});
}

export async function sendAccessGrantedEmail(to: string, conferenceTitle: string) {
	const transport = getTransport();

	if (!transport) {
		console.warn('SMTP not configured — skipping access-granted email to', to);
		return;
	}

	await transport.sendMail({
		from: env.SMTP_FROM,
		to,
		subject: `Přístup ke konferenci „${conferenceTitle}“`,
		text: `Byl vám přidělen přístup ke konferenci „${conferenceTitle}“. Po přihlášení ji najdete ve svém přehledu konferencí.`
	});
}

export async function sendInviteEmail(to: string, firstName: string | null, inviteUrl: string) {
	const transport = getTransport();
	const greeting = firstName ? `Dobrý den, ${firstName}` : 'Dobrý den';

	if (!transport) {
		console.warn('SMTP not configured — skipping invite email to', to);
		return;
	}

	await transport.sendMail({
		from: env.SMTP_FROM,
		to,
		subject: 'Dokončete registraci k Nemocnice Beroun Online konference',
		text: `${greeting},\n\nzaložili jsme vám účet. Pro dokončení registrace si nastavte heslo na odkazu níže — platí 7 dní:\n\n${inviteUrl}\n\nPo dokončení se rovnou přihlásíte.`
	});
}
