import type { APIRoute } from 'astro';
import { getStatePaths } from '../../../../i18n/content';
import { markdownResponse, renderStateMarkdown } from '../../../../lib/llms';

export function getStaticPaths() {
	return getStatePaths();
}

export const GET: APIRoute = async ({ props, site }) =>
	markdownResponse(await renderStateMarkdown('museums', 'en', props.state, site!));
