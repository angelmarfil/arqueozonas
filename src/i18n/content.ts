import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Lang } from './ui';

export function getSlug(entry: { id: string }): string {
	return entry.id.split('/').slice(1).join('/');
}

export function getStates(lang: Lang) {
	return getCollection('states', (state) => state.id.startsWith(`${lang}/`));
}

export function getSites(lang: Lang, stateSlug?: string) {
	return getCollection(
		'sites',
		(site) =>
			site.id.startsWith(`${lang}/`) &&
			(stateSlug === undefined || site.data.state === stateSlug),
	);
}

export async function getSiteState(site: CollectionEntry<'sites'>, lang: Lang) {
	const state = await getEntry('states', `${lang}/${site.data.state}`);
	if (!state) throw new Error(`State "${site.data.state}" not found for language "${lang}" (site ${site.id})`);
	return state;
}

export async function getStatePaths(lang: Lang) {
	const states = await getStates(lang);
	return states.map((state) => ({
		params: { state: getSlug(state) },
		props: { state },
	}));
}

export async function getSitePaths(lang: Lang) {
	const sites = await getSites(lang);
	return sites.map((site) => ({
		params: { state: site.data.state, site: getSlug(site) },
		props: { site },
	}));
}
