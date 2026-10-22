import type { CollectionEntry } from 'astro:content';
import { getMuseums, getPlaceSummary, getSiteState, getSites, getSlug, getStates } from '../i18n/content';
import type { Lang, UIKey } from '../i18n/ui';
import { useTranslatedPath, useTranslations } from '../i18n/utils';

type Place = CollectionEntry<'sites'> | CollectionEntry<'museums'>;
export type Kind = Place['collection'];

const SECTIONS = { sites: '/zonas-arqueologicas', museums: '/museos' } as const;

const KEYS = {
	sites: {
		title: 'nav.sites',
		description: 'seo.sites.description',
		in: 'seo.sitesIn',
		inDescription: 'seo.sitesIn.description',
		place: 'seo.site.description',
		one: 'sites.one',
		other: 'sites.other',
		empty: 'sites.empty',
	},
	museums: {
		title: 'nav.museums',
		description: 'seo.museums.description',
		in: 'seo.museumsIn',
		inDescription: 'seo.museumsIn.description',
		place: 'seo.museum.description',
		one: 'museums.one',
		other: 'museums.other',
		empty: 'museums.empty',
	},
} as const satisfies Record<Kind, Record<string, UIKey>>;

export function getPlaceLang(place: Place): Lang {
	return place.id.split('/')[0] as Lang;
}

function getPagePath(lang: Lang, path: string) {
	return useTranslatedPath(lang)(path).replace(/\/?$/, '/');
}

function getPlacePath(place: Place) {
	return getPagePath(getPlaceLang(place), `${SECTIONS[place.collection]}/${place.data.state}/${getSlug(place)}`);
}

export function getMarkdownUrl(lang: Lang, path: string, site: URL) {
	return new URL(`${getPagePath(lang, path)}index.md`, site).href;
}

export async function getPlaces(kind: Kind, lang: Lang, stateSlug?: string) {
	const places: Place[] = kind === 'sites' ? await getSites(lang, stateSlug) : await getMuseums(lang, stateSlug);
	return places.sort((a, b) => a.data.name.localeCompare(b.data.name, lang));
}

function countLabel(kind: Kind, lang: Lang, count: number) {
	return `${count} ${useTranslations(lang)(count === 1 ? KEYS[kind].one : KEYS[kind].other)}`;
}

export function markdownResponse(body: string) {
	return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}

function renderPage(title: string, description: string, url: string, ...blocks: (string | undefined)[]) {
	return [`# ${title}`, `> ${description}`, `URL: ${url}`, ...blocks].filter(Boolean).join('\n\n').concat('\n');
}

export async function getPlaceLink(place: Place, site: URL) {
	const state = await getSiteState(place);
	const url = new URL(`${getPlacePath(place)}index.md`, site).href;
	const summary = getPlaceSummary(place);
	return `- [${place.data.name} (${state.data.name})](${url})${summary ? `: ${summary}` : ''}`;
}

export async function renderHomeMarkdown(lang: Lang, site: URL) {
	const t = useTranslations(lang);
	const links = await Promise.all(
		(Object.keys(SECTIONS) as Kind[]).map(async (kind) => {
			const count = countLabel(kind, lang, (await getPlaces(kind, lang)).length);
			return `- [${t(KEYS[kind].title)}](${getMarkdownUrl(lang, SECTIONS[kind], site)}): ${count}. ${t(KEYS[kind].description)}`;
		}),
	);
	return renderPage(t('home.title'), t('home.subtitle'), new URL(getPagePath(lang, '/'), site).href, links.join('\n'));
}

export async function renderSectionMarkdown(kind: Kind, lang: Lang, site: URL) {
	const t = useTranslations(lang);
	const places = await getPlaces(kind, lang);
	const links = (await getStates()).map((state) => {
		const count = places.filter((place) => place.data.state === state.id).length;
		const url = getMarkdownUrl(lang, `${SECTIONS[kind]}/${state.id}`, site);
		return `- [${state.data.name}](${url}): ${countLabel(kind, lang, count)}`;
	});
	const url = new URL(getPagePath(lang, SECTIONS[kind]), site).href;
	return renderPage(t(KEYS[kind].title), t(KEYS[kind].description), url, links.join('\n'));
}

export async function renderStateMarkdown(kind: Kind, lang: Lang, state: CollectionEntry<'states'>, site: URL) {
	const t = useTranslations(lang);
	const places = await getPlaces(kind, lang, state.id);
	const links = await Promise.all(places.map((place) => getPlaceLink(place, site)));
	const url = new URL(getPagePath(lang, `${SECTIONS[kind]}/${state.id}`), site).href;
	return renderPage(
		`${t(KEYS[kind].in)} ${state.data.name}`,
		t(KEYS[kind].inDescription).replace('{state}', state.data.name),
		url,
		countLabel(kind, lang, places.length),
		links.length > 0 ? links.join('\n') : t(KEYS[kind].empty),
	);
}

export async function renderPlaceMarkdown(place: Place, site: URL) {
	const lang = getPlaceLang(place);
	const t = useTranslations(lang);
	const state = await getSiteState(place);
	const description = t(KEYS[place.collection].place)
		.replace('{name}', place.data.name)
		.replace('{state}', state.data.name);
	const body = (place.body ?? '').replace(/[ \t]*\{#[\w-]+\}[ \t]*$/gm, '').trim();
	const source = place.data.inahId
		? `${t('site.source.text')} CC BY-NC-ND 4.0 (https://creativecommons.org/licenses/by-nc-nd/4.0/deed.${lang}). ${t('site.source.unmodified')} https://lugares.inah.gob.mx/${lang}/node/${place.data.inahId}`
		: undefined;

	return renderPage(place.data.name, description, new URL(getPlacePath(place), site).href, body, source && `---\n\n${source}`);
}
