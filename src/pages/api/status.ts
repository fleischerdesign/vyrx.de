import type { APIRoute } from 'astro';
import { prometheusQuery } from '../../lib/prometheus.ts';

// Served by the application instead of by the reverse proxy, so the query lives next to the code that
// reads it. The expression is fixed here and never taken from the request.
export const prerender = false;

export const GET: APIRoute = () => prometheusQuery('probe_success');
