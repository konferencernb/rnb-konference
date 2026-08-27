export function getYoutubeVideoId(url: string | null | undefined) {
	if (!url) return '';
	try {
		const parsed = new URL(url);
		if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1);
		if (parsed.pathname.startsWith('/live/')) return parsed.pathname.slice('/live/'.length);
		return parsed.searchParams.get('v') ?? '';
	} catch {
		return '';
	}
}

export function getYoutubeThumbnailUrl(
	url: string | null | undefined,
	quality: 'maxresdefault' | 'hqdefault' = 'maxresdefault'
) {
	const videoId = getYoutubeVideoId(url);
	return videoId ? `https://i.ytimg.com/vi/${videoId}/${quality}.jpg` : null;
}
