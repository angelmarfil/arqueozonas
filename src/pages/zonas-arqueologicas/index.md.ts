import type { APIRoute } from 'astro';
import { markdownResponse, renderSectionMarkdown } from '../../lib/llms';

export const GET: APIRoute = async ({ site }) => markdownResponse(await renderSectionMarkdown('sites', 'es', site!));
