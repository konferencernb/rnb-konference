import DOMPurify from 'isomorphic-dompurify';

export function sanitizeDescription(html: string) {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
		ALLOWED_ATTR: []
	});
}
