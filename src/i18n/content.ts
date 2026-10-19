import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { IMAGE_TRANSFORMS, R2_PUBLIC_URL } from 'astro:env/server';
import { defaultLang, type Lang } from './ui';

type Place = CollectionEntry<'sites'> | CollectionEntry<'museums'>;

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

export function getMuseums(lang: Lang, stateSlug?: string) {
	return getCollection(
		'museums',
		(museum) =>
			museum.id.startsWith(`${lang}/`) &&
			(stateSlug === undefined || museum.data.state === stateSlug),
	);
}

export async function getSiteState(site: Place) {
	const state = await getEntry('states', site.data.state);
	if (!state) throw new Error(`State "${site.data.state}" not found (site ${site.id})`);
	return state;
}

export async function getSiteGallery(site: Place) {
	const slug = getSlug(site);
	const [gallery] = await getCollection('galleries', ({ id }) => id === slug);
	return gallery;
}

export async function getSiteTours(site: CollectionEntry<'sites'>) {
	const slug = getSlug(site);
	const tours = await getCollection('tours', ({ data }) => data.sites.some((ref) => getSlug(ref) === slug));
	return tours.sort((a, b) => Number(b.data.type === 'site') - Number(a.data.type === 'site'));
}

export async function getMuseumTours(museum: CollectionEntry<'museums'>) {
	const slug = getSlug(museum);
	return getCollection('tours', ({ data }) => data.museums.some((ref) => getSlug(ref) === slug));
}

export async function getSiteMuseums(site: CollectionEntry<'sites'>) {
	const [lang] = site.id.split('/');
	return getCollection(
		'museums',
		(museum) => museum.id.startsWith(`${lang}/`) && museum.data.sites.some(({ id }) => id === site.id),
	);
}

export async function getMuseumSites(museum: CollectionEntry<'museums'>) {
	const sites = await Promise.all(museum.data.sites.map((ref) => getEntry(ref)));
	return sites.filter((site) => site !== undefined);
}

const COVER_WIDTH = 640;

export function getImageUrl(key: string, width?: number) {
	const path =
		IMAGE_TRANSFORMS && width
			? `cdn-cgi/image/width=${width},fit=scale-down,format=auto/${key}`
			: key;
	return new URL(path, R2_PUBLIC_URL).href;
}

function getGalleryCover(gallery: CollectionEntry<'galleries'> | undefined) {
	const key = gallery?.data.cover ?? gallery?.data.images[0]?.key;
	return key && getImageUrl(key, COVER_WIDTH);
}

export async function getSiteCover(site: Place) {
	return getGalleryCover(await getSiteGallery(site));
}

export async function getStateCover(state: CollectionEntry<'states'>) {
	if (state.data.cover) return getGalleryCover(await getEntry(state.data.cover));
	for (const site of await getSites(defaultLang, state.id)) {
		const cover = await getSiteCover(site);
		if (cover) return cover;
	}
}

const MUSEUM_COVER_PRIORITY = ['national', 'regional', 'metropolitan', 'site', 'local', 'exhibitionHall', 'communityCenter'];

export async function getStateMuseumCover(state: CollectionEntry<'states'>) {
	const museums = await getMuseums(defaultLang, state.id);
	const rank = (museum: CollectionEntry<'museums'>) => {
		const index = MUSEUM_COVER_PRIORITY.indexOf(museum.data.type ?? '');
		return index === -1 ? MUSEUM_COVER_PRIORITY.length : index;
	};
	for (const museum of museums.sort((a, b) => rank(a) - rank(b))) {
		const cover = await getSiteCover(museum);
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

export async function getMuseumPaths(lang: Lang) {
	const museums = await getMuseums(lang);
	return museums.map((museum) => ({
		params: { state: museum.data.state, museum: getSlug(museum) },
		props: { museum },
	}));
}
