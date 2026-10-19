export function getTransitionName(path: string) {
	const slug = path.replace(/\/+$/, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+/, '');
	return `page-${slug || 'home'}`;
}
