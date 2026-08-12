import { readArchivedFixtures } from './archive.js';
const xmlEscape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));

export default async function handler(request, response) {
  const origin = `https://${request.headers.host}`;
  const today = new Date().toISOString().slice(0, 10);
  let matchEntries = '';

  try {
    const rows = await readArchivedFixtures(30);
    matchEntries = rows.map(row => `<url><loc>${origin}/match/${row.fixture_id}</loc><lastmod>${row.updated_at.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`).join('');
  } catch { /* Homepage remains discoverable even if the database is unavailable. */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xmlEscape(origin)}/</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>${matchEntries}</urlset>`;
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600');
  return response.status(200).send(xml);
}
