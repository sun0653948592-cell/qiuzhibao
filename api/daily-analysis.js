// First-stage analysis feed: one fixtures request plus at most eight prediction requests.
// The limit keeps the API-Football free plan below its 10 requests/minute allowance.
export default async function handler(request, response) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return response.status(503).json({ error: 'API_FOOTBALL_KEY is not configured.' });

  const date = request.query.date || new Date().toISOString().slice(0, 10);
  const apiFetch = async (path) => {
    const upstream = await fetch(`https://v3.football.api-sports.io/${path}`, {
      headers: { 'x-apisports-key': apiKey }
    });
    if (!upstream.ok) throw new Error(`Upstream response: ${upstream.status}`);
    return upstream.json();
  };

  try {
    const fixturesPayload = await apiFetch(`fixtures?date=${encodeURIComponent(date)}`);
    const fixtures = (fixturesPayload.response || []).filter(item => item.fixture.status.short === 'NS');
    const featured = fixtures.slice(0, 8);
    const predictionResults = await Promise.allSettled(
      featured.map(item => apiFetch(`predictions?fixture=${item.fixture.id}`))
    );

    const predictions = {};
    predictionResults.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const prediction = result.value.response?.[0]?.predictions;
      if (prediction) predictions[featured[index].fixture.id] = prediction;
    });

    response.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120');
    return response.status(200).json({ fixtures, predictions, updatedAt: new Date().toISOString() });
  } catch {
    return response.status(502).json({ error: 'Could not load the daily analysis feed.' });
  }
}
