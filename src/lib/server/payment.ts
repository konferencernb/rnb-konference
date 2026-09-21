import QRCode from 'qrcode';

const ACCOUNT_NUMBER = '7632131';
const BANK_CODE = '0100';

export const PAYMENT_ACCOUNT_DISPLAY = `${ACCOUNT_NUMBER}/${BANK_CODE}`;

// Czech domestic account -> IBAN (ISO 13616): CZkk + bank(4) + prefix(6) +
// number(10), where kk = 98 - (BBAN + "CZ00" as digits) mod 97.
function czAccountToIban(accountNumber: string, bankCode: string, prefix = '') {
	const bban =
		bankCode.padStart(4, '0') + prefix.padStart(6, '0') + accountNumber.padStart(10, '0');
	// C = 12, Z = 35
	const checkDigits = 98n - (BigInt(`${bban}123500`) % 97n);
	return `CZ${String(checkDigits).padStart(2, '0')}${bban}`;
}

// Variable symbol: today's date as ddMMyyyy, taken in Czech time — the server
// runs in UTC, which would give yesterday's date for anyone paying shortly
// after midnight.
export function todayVariableSymbol(now = new Date()) {
	const parts = new Intl.DateTimeFormat('cs-CZ', {
		timeZone: 'Europe/Prague',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	}).formatToParts(now);
	const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
	return `${get('day')}${get('month')}${get('year')}`;
}

// A real banking app didn't cope with diacritics in the message, but showed
// the case-preserved ASCII text fine ("Karel Macka") — so diacritics are
// stripped and the case is left alone. "*" is the SPD field separator, so it
// (and anything else outside plain ASCII) becomes a space.
function toSpdMessage(text: string) {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9 $%+\-./:]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 60);
}

export async function buildPayment(options: { amount: number; recipientMessage: string }) {
	const variableSymbol = todayVariableSymbol();
	const iban = czAccountToIban(ACCOUNT_NUMBER, BANK_CODE);

	// QR Platba (SPD 1.0) — https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
	const spd = [
		'SPD*1.0',
		`ACC:${iban}`,
		`AM:${options.amount.toFixed(2)}`,
		'CC:CZK',
		`X-VS:${variableSymbol}`,
		`MSG:${toSpdMessage(options.recipientMessage)}`
	].join('*');

	return {
		qrDataUrl: await QRCode.toDataURL(spd, { errorCorrectionLevel: 'M', margin: 1, width: 256 }),
		account: PAYMENT_ACCOUNT_DISPLAY,
		amount: options.amount,
		variableSymbol,
		recipientMessage: options.recipientMessage
	};
}
