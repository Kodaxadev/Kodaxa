import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('https://kodaxa.dev');
  const projects = await getCollection('projects');
  const paths = ['/', '/work', ...projects.map((project) => `/work/${project.id}`)];
  const entries = paths.map((path) => `<url><loc>${new URL(path, origin).toString()}</loc></url>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
