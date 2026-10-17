import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLang, languages, routes, ui, type Lang, type UIKey } from './ui';

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
