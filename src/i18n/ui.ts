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
		'state.about': 'Acerca del estado',
		'state.viewSites': 'Ver zonas arqueológicas',
		'languagePicker.label': 'Idioma',
	},
	en: {
		'nav.states': 'States',
		'nav.sites': 'Archaeological sites',
		'state.about': 'About the state',
		'state.viewSites': 'View archaeological sites',
		'languagePicker.label': 'Language',
	},
} as const;

export type UIKey = keyof (typeof ui)[typeof defaultLang];

export const routes: Partial<Record<Lang, Record<string, string>>> = {
	en: {
		estados: 'states',
		'zonas-arqueologicas': 'archaeological-sites',
	},
};
