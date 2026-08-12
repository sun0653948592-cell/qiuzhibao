import { buildPrediction } from './model.js';

// One fixtures request plus at most eight standings requests keeps the free plan
// below its 10 requests/minute allowance while using 球智报's own model.
export default async function handler(request, response) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return response.status(503).json({ error: 'API_FOOTBALL_KEY is not configured.' });

  const chinaDate = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
    const get = type => parts.find(part => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const date = request.query.date || chinaDate();
  const apiFetch = async (path) => {
    const upstream = await fetch(`https://v3.football.api-sports.io/${path}`, {
      headers: { 'x-apisports-key': apiKey }
    });
    if (!upstream.ok) throw new Error(`Upstream response: ${upstream.status}`);
    return upstream.json();
  };

  try {
    let fixturesPayload = await apiFetch(`fixtures?date=${encodeURIComponent(date)}`);
    let fixtures = (fixturesPayload.response || []).filter(item => item.fixture.status.short === 'NS');
    // 晚间当天比赛都已开始或结束时，自动切换到次日赛程，避免首页回退到演示数据。
    if (!fixtures.length && !request.query.date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = chinaDate(tomorrow);
      fixturesPayload = await apiFetch(`fixtures?date=${encodeURIComponent(tomorrowDate)}`);
      fixtures = (fixturesPayload.response || []).filter(item => item.fixture.status.short === 'NS');
    }
    const featured = fixtures.slice(0, 8);
    const predictions = {};
    const standingRequests = [...new Map(featured.map(item => [`${item.league.id}-${item.league.season}`, item])).values()];
    const standingResults = await Promise.allSettled(standingRequests.map(item => apiFetch(`standings?league=${item.league.id}&season=${item.league.season}`)));
    const standingsByLeague = new Map();
    standingResults.forEach((result, index) => {
      if (result.status === 'fulfilled') standingsByLeague.set(`${standingRequests[index].league.id}-${standingRequests[index].league.season}`, result.value.response?.[0]?.league?.standings);
    });
    featured.forEach(item => {
      const standings = standingsByLeague.get(`${item.league.id}-${item.league.season}`);
      const prediction = buildPrediction(item.teams.home.id, item.teams.away.id, standings);
      if (prediction) predictions[item.fixture.id] = prediction;
    });

    response.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120');
    return response.status(200).json({ fixtures, predictions, updatedAt: new Date().toISOString() });
  } catch {
    return response.status(502).json({ error: 'Could not load the daily analysis feed.' });
  }
}
