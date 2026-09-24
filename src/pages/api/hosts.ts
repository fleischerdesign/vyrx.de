import type { APIRoute } from 'astro';
import { prometheusQuery } from '../../lib/prometheus.ts';

// Host liveness. `up` carries the scrape targets and labels `instance` with the host name; the page keeps
// only the instances the registry knows, so no host name is written here either.
export const prerender = false;

export const GET: APIRoute = () => prometheusQuery('up');
