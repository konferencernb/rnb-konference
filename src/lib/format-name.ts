// Customers registered before the firstName/lastName split (or any account
// that somehow ends up without them) still only have the legacy combined
// `name` — fall back to that, then to the email, so display code never has
// to special-case older accounts itself.
export function formatCustomerName(customer: {
	firstName?: string | null;
	lastName?: string | null;
	name?: string | null;
	email: string;
}) {
	const parts = [customer.firstName, customer.lastName].filter(
		(part): part is string => !!part && part.trim().length > 0
	);
	if (parts.length > 0) return parts.join(' ');
	return customer.name?.trim() || customer.email;
}
