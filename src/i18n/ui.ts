export const languages = {
	es: 'Español',
	en: 'English',
};

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'es';

export const ui = {
	es: {
		'nav.states': 'Estados',
		'nav.sites': 'Zonas arqueológicas',
		'nav.museums': 'Museos',
		'nav.openMenu': 'Abrir menú',
		'nav.closeMenu': 'Cerrar menú',
		'languagePicker.label': 'Idioma',
	},
	en: {
		'nav.states': 'States',
		'nav.sites': 'Archaeological sites',
		'nav.museums': 'Museums',
		'nav.openMenu': 'Open menu',
		'nav.closeMenu': 'Close menu',
		'languagePicker.label': 'Language',
	},
} as const;

export type UIKey = keyof (typeof ui)[typeof defaultLang];

export const routes: Partial<Record<Lang, Record<string, string>>> = {
	en: {
		'zonas-arqueologicas': 'archaeological-sites',
	},
};
