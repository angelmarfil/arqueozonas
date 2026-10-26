import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLang, languages, locales, routes, ui, type Lang, type UIKey } from './ui';

export function isLang(value: string | undefined): value is Lang {
	return value !== undefined && value in languages;
}

export function getLangFromUrl(url: URL): Lang {
	const [, lang] = url.pathname.split('/');
	return isLang(lang) ? lang : defaultLang;
}

export function useTranslations(lang: Lang) {
	return function t(key: UIKey): string {
		return ui[lang][key] ?? ui[defaultLang][key];
	};
}

export function getMapLabels(t: ReturnType<typeof useTranslations>) {
	return {
		zoomIn: t('map.zoomIn'),
		zoomOut: t('map.zoomOut'),
		fullscreen: t('map.fullscreen'),
		satellite: t('map.satellite'),
		streets: t('map.streets'),
		scrollHint: t('map.scrollHint'),
		touchHint: t('map.touchHint'),
		open: t('site.status.open'),
		closed: t('site.status.closed'),
		details: t('map.details'),
		museumDetails: t('map.museumDetails'),
		stationDetails: t('map.stationDetails'),
		sites: t('nav.sites'),
		museums: t('nav.museums'),
		stations: t('map.stations'),
		close: t('map.close'),
		mayaTrain: t('site.mayaTrain'),
		mayaTrainRoute: t('map.mayaTrainRoute'),
		label: t('map.label'),
		location: t('map.location'),
		legend: t('map.legend'),
		layers: t('map.layers'),
		cluster: t('map.cluster'),
	};
}

export function formatVisitorCount(lang: Lang, { total, year }: { total: number; year: number }) {
	return useTranslations(lang)('visitors.count')
		.replace('{count}', new Intl.NumberFormat(locales[lang]).format(total))
		.replace('{year}', String(year));
}

export type MapLabels = ReturnType<typeof getMapLabels>;

export function useTranslatedPath(lang: Lang) {
	return function translatePath(path: string, l: Lang = lang): string {
		const translated = path
			.split('/')
			.map((segment) => routes[l]?.[segment] ?? segment)
			.join('/');
		return getRelativeLocaleUrl(l, translated);
	};
}

export function getRouteFromUrl(url: URL): string {
	const lang = getLangFromUrl(url);
	const segments = url.pathname.split('/').filter(Boolean);
	if (lang !== defaultLang) segments.shift();

	const reversed = Object.fromEntries(
		Object.entries(routes[lang] ?? {}).map(([source, target]) => [target, source]),
	);
	return '/' + segments.map((segment) => reversed[segment] ?? segment).join('/');
}
