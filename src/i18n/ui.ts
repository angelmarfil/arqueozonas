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
		'languagePicker.label': 'Idioma',
	},
	en: {
		'nav.states': 'States',
		'nav.sites': 'Archaeological sites',
		'languagePicker.label': 'Language',
	},
} as const;

export type UIKey = keyof (typeof ui)[typeof defaultLang];

export const routes: Partial<Record<Lang, Record<string, string>>> = {
	en: {
		'zonas-arqueologicas': 'archaeological-sites',
	},
};
