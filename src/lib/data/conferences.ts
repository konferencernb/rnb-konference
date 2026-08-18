export type ConferenceStatus = 'live' | 'upcoming' | 'archived';

export interface Conference {
	slug: string;
	title: string;
	description: string;
	date: string;
	status: ConferenceStatus;
}

export const conferences: Conference[] = [
	{
		slug: 'test',
		title: 'Test',
		description: 'Testová konference',
		date: '29. července 2026',
		status: 'live'
	}
];

export const archivedConferences: Conference[] = [];
