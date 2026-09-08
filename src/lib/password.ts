// Shared between the completion form (instant feedback) and the API route
// (the actual enforcement — client-side validation alone is never enough).
export function validatePassword(password: string): string | null {
	if (password.length < 8) return 'Heslo musí mít alespoň 8 znaků.';
	if (!/[A-Z]/.test(password)) return 'Heslo musí obsahovat velké písmeno.';
	if (!/[0-9]/.test(password)) return 'Heslo musí obsahovat číslici.';
	if (!/[^A-Za-z0-9]/.test(password)) return 'Heslo musí obsahovat speciální znak.';
	return null;
}
