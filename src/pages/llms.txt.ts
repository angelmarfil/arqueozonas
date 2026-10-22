import type { APIRoute } from 'astro';
import { SITE_TITLE } from 'astro:env/client';
import { languages, type Lang, type UIKey } from '../i18n/ui';
import { useTranslations } from '../i18n/utils';
import { getMarkdownUrl, getPlaceLink, getPlaces, markdownResponse, type Kind } from '../lib/llms';

const KINDS = [
	['sites', 'nav.sites', 'seo.sites.description', '/zonas-arqueologicas'],
	['museums', 'nav.museums', 'seo.museums.description', '/museos'],
] as const satisfies [Kind, UIKey, UIKey, string][];

export const GET: APIRoute = async ({ site }) => {
	const base = site!;
	const langs = Object.keys(languages) as Lang[];
	const sections: string[] = [];
	const optional: string[] = [];

	for (const lang of langs) {
		const t = useTranslations(lang);
		optional.push(`- [${t('home.title')} (${languages[lang]})](${getMarkdownUrl(lang, '/', base)}): ${t('home.subtitle')}`);
		for (const [kind, title, description, path] of KINDS) {
			const links = await Promise.all((await getPlaces(kind, lang)).map((place) => getPlaceLink(place, base)));
			sections.push(`## ${t(title)} (${languages[lang]})\n\n${links.join('\n')}`);
			optional.push(`- [${t(title)} (${languages[lang]})](${getMarkdownUrl(lang, path, base)}): ${t(description)}`);
		}
	}

	const body = [
		`# ${SITE_TITLE}`,
		`> ${useTranslations('es')('home.subtitle')} / ${useTranslations('en')('home.subtitle')}`,
		[
			'Sitio bilingüe (español e inglés) sobre zonas arqueológicas y museos del INAH en México.',
			'Cada página tiene una versión en Markdown en su misma URL terminada en `index.md`; los enlaces de este archivo apuntan a esa versión.',
			'Los textos provienen de Lugares INAH bajo licencia CC BY-NC-ND 4.0.',
		].join(' '),
		...sections,
		`## Optional\n\n${optional.join('\n')}`,
	].join('\n\n');

	return markdownResponse(`${body}\n`);
};
