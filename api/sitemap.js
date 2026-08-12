const xmlEscape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));

export default async function handler(request, response) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const origin = `https://${request.headers.host}`;
  const today = new Date().toISOString().slice(0, 10);
  let matchEntries = '';

  if (apiKey) {
    try {
      const upstream = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, { headers: { 'x-apisports-key': apiKey } });
      const payload = await upstream.json();
      matchEntries = (payload.response || [])
        .filter(item => item.fixture.status.short === 'NS')
        .slice(0, 30)
        .map(item => `<url><loc>${origin}/match/${item.fixture.id}</loc><lastmod>${item.fixture.date.slice(0, 10)}</lastmod><changefreq>hourly</changefreq><priority>0.8</priority></url>`)
        .join('');
    } catch { /* Homepage remains discoverable even if the sports provider is unavailable. */ }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xmlEscape(origin)}/</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>${matchEntries}</urlset>`;
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600');
  return response.status(200).send(xml);
}
