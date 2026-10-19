import type { Loader } from 'astro/loaders';
import states from '../data/states.json';
import { normalizeName } from '../lib/visitor-matching';

const PACKAGE_API = 'https://www.datos.gob.mx/api/3/action/package_show';
const TIMEOUT = 30_000;

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const stateSlugs = new Map(Object.entries(states).map(([slug, { name }]) => [name, slug]));

interface VisitorRecord {
	name: string;
	state: string;
	years: { year: number; national: number[]; foreign: number[] }[];
}

function parseCsv(text: string) {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') field += text[++i];
			else if (char === '"') quoted = false;
			else field += char;
		} else if (char === '"') {
			quoted = true;
		} else if (char === ',') {
			row.push(field);
			field = '';
		} else if (char === '\n') {
			rows.push([...row, field.replace(/\r$/, '')]);
			row = [];
			field = '';
		} else {
			field += char;
		}
	}
	if (field || row.length) rows.push([...row, field]);
	return rows;
}

function parseRecords(text: string) {
	const [header, ...rows] = parseCsv(text.replace(/^﻿/, ''));
	const column = (name: string) => {
		const index = header.indexOf(name);
		if (index === -1) throw new Error(`Missing column "${name}"`);
		return index;
	};
	const [year, state, siinahId, name] = ['anio', 'estado', 'clave_siinah', 'recinto'].map(column);
	const national = MONTHS.map((month) => column(`${month}_nac`));
	const foreign = MONTHS.map((month) => column(`${month}_ext`));
	const count = (row: string[], index: number) => Math.max(Number.parseInt(row[index], 10) || 0, 0);

	const records = new Map<string, VisitorRecord & { latest: number }>();
	for (const row of rows.filter((row) => row[name]?.trim())) {
		const rowYear = Number.parseInt(row[year], 10);
		const rowName = row[name].trim();
		const rowState = stateSlugs.get(row[state].trim()) ?? normalizeName(row[state]).replaceAll(' ', '-');
		const id = `${rowState}/${Number.parseInt(row[siinahId], 10) || normalizeName(rowName).replaceAll(' ', '-')}`;

		const record = records.get(id) ?? { name: rowName, state: rowState, years: [], latest: rowYear };
		if (rowYear >= record.latest) Object.assign(record, { name: rowName, latest: rowYear });
		records.set(id, record);

		let counts = record.years.find((entry) => entry.year === rowYear);
		if (!counts) {
			counts = { year: rowYear, national: Array(12).fill(0), foreign: Array(12).fill(0) };
			record.years.push(counts);
		}
		for (let month = 0; month < 12; month++) {
			counts.national[month] += count(row, national[month]);
			counts.foreign[month] += count(row, foreign[month]);
		}
	}

	return [...records].map(([id, { latest, ...record }]) => ({
		id,
		...record,
		years: record.years.sort((a, b) => a.year - b.year),
	}));
}

async function download(packageId: string) {
	const signal = AbortSignal.timeout(TIMEOUT);
	const api = await fetch(`${PACKAGE_API}?id=${packageId}`, { signal });
	if (!api.ok) throw new Error(`datos.gob.mx returned ${api.status}`);
	const { result } = await api.json();
	const url = result?.resources?.find(({ format }: { format?: string }) => format?.toUpperCase() === 'CSV')?.url;
	if (!url) throw new Error('no CSV resource');
	const csv = await fetch(url, { signal });
	if (!csv.ok) throw new Error(`${url} returned ${csv.status}`);
	return parseRecords(await csv.text());
}

export function inahVisitorsLoader(packageId: string): Loader {
	return {
		name: 'inah-visitors',
		load: async ({ store, logger, parseData, generateDigest }) => {
			let records: Awaited<ReturnType<typeof download>>;
			try {
				records = await download(packageId);
			} catch (error) {
				logger.warn(`${packageId}: ${error}. Keeping ${store.keys().length} cached records.`);
				return;
			}
			store.clear();
			for (const { id, ...record } of records) {
				const data = await parseData({ id, data: record });
				store.set({ id, data, digest: generateDigest(data) });
			}
			logger.info(`${packageId}: ${records.length} records`);
		},
	};
}
