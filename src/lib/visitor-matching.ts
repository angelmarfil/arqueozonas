const STOPWORDS = new Set(['a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'los', 'y']);

const NOISE = [
	/\bz a\b/g,
	/\bzona (arqueologica|paleontologica)\b/g,
	/\bmuseo de sitio\b/g,
	/\bcon museo\b.*$/,
	/\bcon (zona arqueologica|z a)\b.*$/,
];

export interface VisitorPlace {
	slug: string;
	name: string;
	state: string;
}

export interface VisitorRecordName {
	id: string;
	name: string;
	state: string;
}

export function normalizeName(name: string) {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function nameTokens(name: string) {
	const normalized = NOISE.reduce((value, pattern) => value.replace(pattern, ' '), normalizeName(name));
	return new Set(normalized.split(' ').filter((token) => token && !STOPWORDS.has(token)));
}

function similarity(a: Set<string>, b: Set<string>) {
	const shared = [...a].filter((token) => b.has(token)).length;
	if (shared === 0) return 0;
	const union = new Set([...a, ...b]).size;
	const contained = shared === a.size || shared === b.size;
	return (contained ? 1 : 0) + shared / union;
}

export function matchVisitorRecords(
	place: VisitorPlace,
	records: VisitorRecordName[],
	aliases: Record<string, string[]>,
) {
	const alias = aliases[place.slug];
	if (alias) {
		const names = new Set(alias.map(normalizeName));
		return records.filter(({ name }) => names.has(normalizeName(name))).map(({ id }) => id);
	}

	const tokens = nameTokens(place.name);
	const [best, next] = records
		.filter(({ state }) => state === place.state)
		.map(({ id, name }) => ({ id, score: similarity(tokens, nameTokens(name)) }))
		.filter(({ score }) => score >= 1)
		.sort((a, b) => b.score - a.score);
	return best && (!next || best.score > next.score) ? [best.id] : [];
}
