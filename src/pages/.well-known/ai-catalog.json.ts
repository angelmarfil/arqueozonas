import type { APIRoute } from 'astro';
import { aiCatalogResponse } from '../../lib/ai-catalog';

export const GET: APIRoute = ({ site }) => aiCatalogResponse(site!, 'application/ai-catalog+json');
