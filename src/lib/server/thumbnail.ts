import sharp from 'sharp';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// Matches a YouTube maxresdefault thumbnail's aspect ratio (16:9) — the
// conference card crops to `aspect-video` regardless, but cropping server-side
// keeps the stored data URL (and every page that lists conferences) small.
const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;

export type ThumbnailResult = { dataUrl: string } | { error: string };

// Never trusts the upload as-is: resized/re-encoded to WebP regardless of
// what was uploaded, both to bound the size of what ends up inline in the
// conference row (and every page that lists conferences) and because sharp
// re-encoding a file that isn't actually a valid image is what surfaces that
// error, rather than silently storing garbage.
export async function processThumbnail(file: File): Promise<ThumbnailResult> {
	if (file.size > MAX_UPLOAD_BYTES) {
		return { error: 'Obrázek je moc velký — maximum je 8 MB.' };
	}

	let buffer: Buffer;
	try {
		buffer = Buffer.from(await file.arrayBuffer());
		const resized = await sharp(buffer)
			.resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover' })
			.webp({ quality: 80 })
			.toBuffer();
		return { dataUrl: `data:image/webp;base64,${resized.toString('base64')}` };
	} catch {
		return { error: 'Soubor se nepodařilo zpracovat jako obrázek.' };
	}
}
