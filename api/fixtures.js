// Vercel serverless endpoint. Keep API keys on the server only.
// GET /api/fixtures?date=2026-08-12&league=39
export default async function handler(request, response) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return response.status(503).json({ error: 'API_FOOTBALL_KEY is not configured.' });

  const date = request.query.date || new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({ date });
  if (request.query.league) params.set('league', request.query.league);
  if (request.query.season) params.set('season', request.query.season);

  try {
    const upstream = await fetch(`https://v3.football.api-sports.io/fixtures?${params}`, {
      headers: { 'x-apisports-key': apiKey }
    });
    const payload = await upstream.json();
    response.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    return response.status(upstream.status).json(payload);
  } catch {
    return response.status(502).json({ error: 'Could not reach the football data provider.' });
  }
}
