import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { IMAGE_TRANSFORMS, R2_PUBLIC_URL } from 'astro:env/server';
import { visitorAliases } from '../lib/visitor-aliases';
import { matchVisitorRecords } from '../lib/visitor-matching';
import { defaultLang, type Lang } from './ui';
import { isLang } from './utils';

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
const SOCIAL_IMAGE_WIDTH = 1200;
const SUMMARY_LENGTH = 160;

export function getImageUrl(key: string, width?: number) {
	const path =
		IMAGE_TRANSFORMS && width
			? `cdn-cgi/image/width=${width},fit=scale-down,format=auto/${key}`
			: key;
	return new URL(path, R2_PUBLIC_URL).href;
}

function getGalleryCover(gallery: CollectionEntry<'galleries'> | undefined, width = COVER_WIDTH) {
	const key = gallery?.data.cover ?? gallery?.data.images[0]?.key;
	return key && getImageUrl(key, width);
}

export async function getSiteCover(site: Place) {
	return getGalleryCover(await getSiteGallery(site));
}

export async function getSiteSocialImage(site: Place) {
	return getGalleryCover(await getSiteGallery(site), SOCIAL_IMAGE_WIDTH);
}

export function getPlaceSummary(place: Place) {
	const section = place.body?.match(/\{#description\}[^\n]*\n([\s\S]*?)(?=\n#{1,6}\s|$)/)?.[1];
	if (!section) return;
	const text = section
		.replace(/<[^>]+>/g, '')
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[*_`]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (!text) return;
	if (text.length <= SUMMARY_LENGTH) return text;
	const cut = text.slice(0, text.lastIndexOf(' ', SUMMARY_LENGTH - 1)).replace(/[\s,.;:]+$/, '');
	return `${cut}…`;
}

export async function getPlaceLangs(place: Place) {
	const slug = getSlug(place);
	const entries = await getCollection(place.collection, ({ id }) => getSlug({ id }) === slug);
	return entries.map(({ id }) => id.split('/')[0]).filter(isLang);
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

type VisitorCollection = 'siteVisitors' | 'museumVisitors';

const VISITOR_COLLECTIONS = { sites: 'siteVisitors', museums: 'museumVisitors' } as const;

export interface VisitorTotals {
	year: number;
	national: number;
	foreign: number;
	months: number;
}

function sum(values: number[]) {
	return values.reduce((total, value) => total + value, 0);
}

export async function getVisitorYears(collection: VisitorCollection): Promise<VisitorTotals[]> {
	const totals = new Map<number, { national: number[]; foreign: number[] }>();
	for (const { data } of await getCollection(collection)) {
		for (const { year, national, foreign } of data.years) {
			const entry = totals.get(year) ?? { national: Array(12).fill(0), foreign: Array(12).fill(0) };
			national.forEach((count, month) => (entry.national[month] += count));
			foreign.forEach((count, month) => (entry.foreign[month] += count));
			totals.set(year, entry);
		}
	}
	return [...totals]
		.sort(([a], [b]) => a - b)
		.map(([year, { national, foreign }]) => ({
			year,
			national: sum(national),
			foreign: sum(foreign),
			months: national.findLastIndex((count, month) => count + foreign[month] > 0) + 1,
		}));
}

export async function getLatestVisitorYear(collection: VisitorCollection) {
	return (await getVisitorYears(collection)).findLast(({ months }) => months === 12)?.year;
}

export async function getRecordVisitors(collection: VisitorCollection, ids: string[], year: number) {
	let national = 0;
	let foreign = 0;
	for (const id of ids) {
		const record = await getEntry(collection, id);
		const counts = record?.data.years.find((entry) => entry.year === year);
		if (!counts) continue;
		national += sum(counts.national);
		foreign += sum(counts.foreign);
	}
	return { year, national, foreign, total: national + foreign };
}

export async function getPlaceVisitorRecords(place: Place) {
	const slug = getSlug(place);
	const id = `${defaultLang}/${slug}`;
	const source = (place.collection === 'sites' ? await getEntry('sites', id) : await getEntry('museums', id)) ?? place;
	const records = await getCollection(VISITOR_COLLECTIONS[place.collection]);
	return matchVisitorRecords(
		{ slug, name: source.data.name, state: source.data.state },
		records.map(({ id, data }) => ({ id, name: data.name, state: data.state })),
		visitorAliases[place.collection],
	);
}

export async function getPlaceVisitors(place: Place) {
	const ids = await getPlaceVisitorRecords(place);
	if (ids.length === 0) return;
	const collection = VISITOR_COLLECTIONS[place.collection];
	const year = await getLatestVisitorYear(collection);
	if (year === undefined) return;
	const visitors = await getRecordVisitors(collection, ids, year);
	return visitors.total > 0 ? visitors : undefined;
}
