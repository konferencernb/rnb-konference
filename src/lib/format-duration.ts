export function formatDuration(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	if (hours > 0) return `${hours} h ${minutes} min`;
	if (minutes > 0) return `${minutes} min`;
	return `${totalSeconds} s`;
}
