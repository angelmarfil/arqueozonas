import type { APIRoute } from 'astro';
import { getSitePaths } from '../../../../../i18n/content';
import { markdownResponse, renderPlaceMarkdown } from '../../../../../lib/llms';

export function getStaticPaths() {
	return getSitePaths('en');
}

export const GET: APIRoute = async (context) =>
	markdownResponse(await renderPlaceMarkdown(context.props.site, context.site!));
