// A single "bulletproof" HTML email shell shared by every transactional
// email — table-based layout, inline styles, no flexbox/grid/background
// images. That combination is what actually renders consistently across
// Outlook desktop (renders HTML via Word, not a browser engine), Gmail,
// and Apple Mail, rather than degrading gracefully in some of them.

import { env } from '$env/dynamic/private';

// Absolute URL — email clients can't resolve a relative path or a bundled
// asset, so the logo is served straight from the running site (same base
// as the CTA links). SVG doesn't render in most email clients, hence the
// PNG. Falls back to a plain-text wordmark if ORIGIN isn't set (e.g. a
// misconfigured environment).
const LOGO_URL = env.ORIGIN ? `${env.ORIGIN}/logo-rnb.png` : '';

// #005795 — Rehabilitační Nemocnice Beroun brand blue (per brand manual).
const BRAND_BLUE = '#005795';
const INK = '#101b3d';
const MUTED = '#5b6472';
const BORDER = '#e3e6ee';
const PAGE_BG = '#f2f4f8';

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function renderEmailLayout(options: {
	preheader: string;
	heading: string;
	// Pre-escaped HTML paragraphs — callers build these with escapeEmailText()
	// below so user-controlled values (names, conference titles) can't break
	// the markup.
	bodyHtml: string;
	ctaLabel?: string;
	ctaUrl?: string;
}) {
	const { preheader, heading, bodyHtml, ctaLabel, ctaUrl } = options;

	const button =
		ctaLabel && ctaUrl
			? `
		<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 4px;">
			<tr>
				<td style="border-radius: 8px; background-color: ${BRAND_BLUE};">
					<a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 8px;">
						${escapeHtml(ctaLabel)}
					</a>
				</td>
			</tr>
		</table>
		<p style="margin: 12px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: ${MUTED}; word-break: break-all;">
			Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:<br>
			<a href="${ctaUrl}" target="_blank" style="color: ${BRAND_BLUE};">${ctaUrl}</a>
		</p>`
			: '';

	return `<!doctype html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title></title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>
</xml>
</noscript>
<style>table { border-collapse: collapse; } td, a { mso-line-height-rule: exactly; }</style>
<![endif]-->
<style>
	body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
	table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
	img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
	body { margin: 0; padding: 0; width: 100% !important; background-color: ${PAGE_BG}; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${PAGE_BG};">
	<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
		${escapeHtml(preheader)}
		&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
	</div>
	<!--[if mso]>
	<table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td>
	<![endif]-->
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">
		<tr>
			<td style="padding: 32px 32px 20px;">
				${
					LOGO_URL
						? `<img src="${LOGO_URL}" width="180" alt="Rehabilitační Nemocnice Beroun" style="display: block; width: 180px; height: auto;">`
						: `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: ${BRAND_BLUE};">Rehabilitační Nemocnice Beroun</div>`
				}
			</td>
		</tr>
		<tr>
			<td style="background-color: #ffffff; border: 1px solid ${BORDER}; border-radius: 12px; padding: 36px 32px;">
				<h1 style="margin: 0 0 16px; font-family: Arial, Helvetica, sans-serif; font-size: 20px; line-height: 1.35; color: ${INK};">
					${escapeHtml(heading)}
				</h1>
				<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.65; color: #2b3140;">
					${bodyHtml}
				</div>
				${button}
			</td>
		</tr>
		<tr>
			<td style="padding: 24px 32px 40px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: ${MUTED};">
				Rehabilitační Nemocnice Beroun — Online konference<br>
				Tento e-mail je automatický, na tuto adresu prosím neodpovídejte.<br>
				V případě problémů se obraťte na <a href="mailto:community@nember.cz" style="color: ${BRAND_BLUE};">community@nember.cz</a>.
			</td>
		</tr>
	</table>
	<!--[if mso]>
	</td></tr></table>
	<![endif]-->
</body>
</html>`;
}

// Escapes a value for direct interpolation into a <p> in bodyHtml — kept
// separate from the layout's own escapeHtml so callers building the body
// paragraphs don't need to reach into this module's internals.
export function escapeEmailText(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
