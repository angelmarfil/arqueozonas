import type { APIRoute } from 'astro';
import { getMuseumPaths } from '../../../../i18n/content';
import { markdownResponse, renderPlaceMarkdown } from '../../../../lib/llms';

export function getStaticPaths() {
	return getMuseumPaths('es');
}

export const GET: APIRoute = async (context) =>
	markdownResponse(await renderPlaceMarkdown(context.props.museum, context.site!));
