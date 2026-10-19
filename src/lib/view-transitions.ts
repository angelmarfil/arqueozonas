export function getTransitionName(path: string) {
	return path.replace(/\/+$/, '');
}
