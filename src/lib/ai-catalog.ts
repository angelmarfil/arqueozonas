import { SITE_TITLE } from 'astro:env/client';
import { useTranslations } from '../i18n/utils';

// AI Catalog (https://agent-card.github.io/ai-catalog/spec/) and
// Agentic Resource Discovery (https://agenticresourcediscovery.org/spec/) manifest.
export function aiCatalogResponse(site: URL, contentType: string) {
	const es = useTranslations('es');
	const en = useTranslations('en');
	const catalog = {
		specVersion: '1.0',
		host: {
			displayName: SITE_TITLE,
			documentationUrl: new URL('/', site).href,
			logoUrl: new URL('/favicon/web-app-manifest-512x512.png', site).href,
		},
		entries: [
			{
				'@context': 'https://agenticresourcediscovery.org/context/v1',
				identifier: `urn:air:${site.hostname}:knowledge:llms-txt`,
				displayName: `${SITE_TITLE} (llms.txt)`,
				type: 'text/markdown',
				url: new URL('/llms.txt', site).href,
				description: `${es('home.subtitle')} / ${en('home.subtitle')}`,
				tags: ['arqueología', 'museos', 'INAH', 'México', 'archaeology', 'museums', 'Mexico'],
				representativeQueries: [
					'¿Cuál es el horario de Chichén Itzá?',
					'¿Cuánto cuesta la entrada a Teotihuacan?',
					'How do I get to the Palenque archaeological site?',
					'Which INAH museums are in Oaxaca?',
				],
			},
		],
	};
	return new Response(`${JSON.stringify(catalog, null, 2)}\n`, {
		headers: { 'Content-Type': `${contentType}; charset=utf-8` },
	});
}
