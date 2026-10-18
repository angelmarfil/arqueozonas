import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { R2_PUBLIC_URL } from 'astro:env/server';
import { defaultLang, type Lang } from './ui';

export function getSlug(entry: { id: string }): string {
	return entry.id.split('/').slice(1).join('/');
}

export function getStates() {
	return getCollection('states');
}

export function getSites(lang: Lang, stateSlug?: string) {
	return getCollection(
		'sites',
		(site) =>
			site.id.startsWith(`${lang}/`) &&
			(stateSlug === undefined || site.data.state === stateSlug),
	);
}

export async function getSiteState(site: CollectionEntry<'sites'>) {
	const state = await getEntry('states', site.data.state);
	if (!state) throw new Error(`State "${site.data.state}" not found (site ${site.id})`);
	return state;
}

export async function getSiteGallery(site: CollectionEntry<'sites'>) {
	const slug = getSlug(site);
	const [gallery] = await getCollection('galleries', ({ id }) => id === slug);
	return gallery;
}

function getGalleryCover(gallery: CollectionEntry<'galleries'> | undefined) {
	const key = gallery?.data.cover ?? gallery?.data.images[0]?.key;
	return key && new URL(key, R2_PUBLIC_URL).href;
}

export async function getSiteCover(site: CollectionEntry<'sites'>) {
	return getGalleryCover(await getSiteGallery(site));
}

export async function getStateCover(state: CollectionEntry<'states'>) {
	if (state.data.cover) return getGalleryCover(await getEntry(state.data.cover));
	for (const site of await getSites(defaultLang, state.id)) {
		const cover = await getSiteCover(site);
		if (cover) return cover;
	}
}

export async function getStatePaths() {
	const states = await getStates();
	return states.map((state) => ({
		params: { state: state.id },
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
