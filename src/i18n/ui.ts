export const languages = {
	es: 'Español',
	en: 'English',
};

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'es';

export const ui = {
	es: {
		'nav.home': 'Inicio',
		'nav.breadcrumbs': 'Ruta de navegación',
		'nav.states': 'Estados',
		'nav.sites': 'Zonas arqueológicas',
		'nav.museums': 'Museos',
		'nav.openMenu': 'Abrir menú',
		'nav.closeMenu': 'Cerrar menú',
		'sites.one': 'zona arqueológica',
		'sites.other': 'zonas arqueológicas',
		'sites.empty': 'Aún no hay zonas arqueológicas registradas en este estado.',
		'site.guide.download': 'Descargar guía',
		'site.gallery.credit': 'Imagen',
		'site.lastReviewed': 'Última revisión',
		'site.status.open': 'Abierta',
		'site.status.closed': 'Cerrada',
		'site.mayaTrain': 'Tren Maya',
		'site.section.visit': 'Visita',
		'site.source.text': 'Texto',
		'site.source.sic': 'Sistema de Información Cultural',
		'site.source.publisher': 'Secretaría de Cultura / INAH. Reproducido con fines no comerciales.',
		'site.gallery.license': 'Imágenes © INAH bajo licencia',
		'site.gallery.source': 'Ver en Lugares INAH',
		'languagePicker.label': 'Idioma',
		'seo.sitesIn': 'Zonas arqueológicas en',
		'seo.sites.description': 'Explora las zonas arqueológicas de México organizadas por estado.',
	},
	en: {
		'nav.home': 'Home',
		'nav.breadcrumbs': 'Breadcrumb',
		'nav.states': 'States',
		'nav.sites': 'Archaeological sites',
		'nav.museums': 'Museums',
		'nav.openMenu': 'Open menu',
		'nav.closeMenu': 'Close menu',
		'sites.one': 'archaeological site',
		'sites.other': 'archaeological sites',
		'sites.empty': 'No archaeological sites have been added for this state yet.',
		'site.guide.download': 'Download guide',
		'site.gallery.credit': 'Image',
		'site.lastReviewed': 'Last reviewed',
		'site.status.open': 'Open',
		'site.status.closed': 'Closed',
		'site.mayaTrain': 'Tren Maya',
		'site.section.visit': 'Visit',
		'site.source.text': 'Text',
		'site.source.sic': 'Sistema de Información Cultural',
		'site.source.publisher': 'Secretaría de Cultura / INAH. Reproduced for non-commercial purposes.',
		'site.gallery.license': 'Images © INAH licensed under',
		'site.gallery.source': 'View on Lugares INAH',
		'languagePicker.label': 'Language',
		'seo.sitesIn': 'Archaeological sites in',
		'seo.sites.description': "Explore Mexico's archaeological sites by state.",
	},
} as const;

export type UIKey = keyof (typeof ui)[typeof defaultLang];

export const routes: Partial<Record<Lang, Record<string, string>>> = {
	en: {
		'zonas-arqueologicas': 'archaeological-sites',
	},
};
