import type { APIRoute } from 'astro';
import { markdownResponse, renderHomeMarkdown } from '../../lib/llms';

export const GET: APIRoute = async ({ site }) => markdownResponse(await renderHomeMarkdown('en', site!));
