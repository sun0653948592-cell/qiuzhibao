const databaseUrl = () => process.env.SUPABASE_URL?.replace(/\/$/, '');
const databaseKey = () => process.env.SUPABASE_SECRET_KEY;

async function databaseRequest(path, options = {}) {
  const url = databaseUrl();
  const key = databaseKey();
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Database request failed: ${response.status}`);
  return response;
}

export function archiveToFixture(row) {
  return row.source_payload;
}

export function archiveToPrediction(row) {
  if (row.home_win_probability === null || row.draw_probability === null || row.away_win_probability === null) return null;
  return {
    percent: { home: `${row.home_win_probability}%`, draw: `${row.draw_probability}%`, away: `${row.away_win_probability}%` },
    advice: row.model_advice,
    label: row.model_version,
    inputs: row.model_inputs || {}
  };
}

export async function readArchivedFixtures(daysAhead = 7) {
  // Retain recent completed pages for SEO as well as all future fixtures.
  const cutoff = new Date(Date.now() - daysAhead * 24 * 60 * 60 * 1000).toISOString();
  const limit = Math.max(30, daysAhead * 35);
  const response = await databaseRequest(`match_archives?select=*&kickoff_at=gte.${encodeURIComponent(cutoff)}&order=kickoff_at.asc&limit=${limit}`);
  return response ? response.json() : [];
}

export async function readArchivedFixture(fixtureId) {
  const response = await databaseRequest(`match_archives?select=*&fixture_id=eq.${encodeURIComponent(fixtureId)}&limit=1`);
  if (!response) return null;
  const rows = await response.json();
  return rows[0] || null;
}

export async function saveFixtures(fixtures, predictions = {}) {
  if (!databaseUrl() || !databaseKey() || !fixtures.length) return;
  const rows = fixtures.map(item => {
    const prediction = predictions[item.fixture.id];
    const percentage = prediction?.percent;
    return {
      fixture_id: item.fixture.id,
      league_id: item.league.id,
      season: item.league.season,
      league_name: item.league.name,
      home_team_id: item.teams.home.id,
      home_team_name: item.teams.home.name,
      away_team_id: item.teams.away.id,
      away_team_name: item.teams.away.name,
      kickoff_at: item.fixture.date,
      status: item.fixture.status.short,
      home_score: item.goals?.home,
      away_score: item.goals?.away,
      model_version: prediction?.label || null,
      home_win_probability: percentage ? Number.parseInt(percentage.home, 10) : null,
      draw_probability: percentage ? Number.parseInt(percentage.draw, 10) : null,
      away_win_probability: percentage ? Number.parseInt(percentage.away, 10) : null,
      model_advice: prediction?.advice || null,
      model_inputs: prediction?.inputs || {},
      source_payload: item,
      updated_at: new Date().toISOString()
    };
  });
  await databaseRequest('match_archives?on_conflict=fixture_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
}
