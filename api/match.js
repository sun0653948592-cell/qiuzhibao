const chineseNames = {
  'Premier League': '英超', 'La Liga': '西甲', 'Serie A': '意甲', 'Bundesliga': '德甲', 'Ligue 1': '法甲',
  'UEFA Champions League': '欧冠', 'UEFA Europa League': '欧联杯', 'UEFA Europa Conference League': '欧协联',
  'Club Friendlies': '国际友谊赛', 'Friendlies Clubs': '俱乐部友谊赛', 'Cup': '杯赛',
  'Arsenal': '阿森纳', 'Chelsea': '切尔西', 'Liverpool': '利物浦', 'Manchester City': '曼城', 'Manchester United': '曼联',
  'Tottenham': '热刺', 'Newcastle': '纽卡斯尔联', 'Aston Villa': '阿斯顿维拉', 'Real Madrid': '皇家马德里',
  'Barcelona': '巴塞罗那', 'Atletico Madrid': '马德里竞技', 'Real Sociedad': '皇家社会', 'Bayern Munich': '拜仁慕尼黑',
  'Borussia Dortmund': '多特蒙德', 'Bayer Leverkusen': '勒沃库森', 'Inter': '国际米兰', 'Inter Milan': '国际米兰',
  'AC Milan': 'AC米兰', 'Juventus': '尤文图斯', 'Napoli': '那不勒斯', 'Paris Saint Germain': '巴黎圣日耳曼',
  'Marseille': '马赛', 'Monaco': '摩纳哥', 'FK Kukesi': '库克斯', 'Besa Kavajë': '贝萨卡瓦耶',
  'East Bengal II': '东孟加拉二队', 'Al Arabi': '阿拉比', 'Amkar': '阿姆卡尔',
  'Pobeda Nizhny Novgorod': '下诺夫哥罗德波别达', 'Pobeda Nizhniy Novgorod': '下诺夫哥罗德波别达',
  'Kaluga': '卡卢加', 'Iskra Smolensk': '斯摩棱斯克火花'
  , 'Fundacion Amigos': '阿米戈斯基金会', 'Costa Brava': '布拉瓦海岸'
};

const cn = (value) => chineseNames[value] || value;
const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const pct = (value, fallback = 33) => Number.parseInt(value, 10) || fallback;

function localizeAdvice(value) {
  let text = String(value || '');
  Object.entries(chineseNames).forEach(([english, chinese]) => { text = text.replaceAll(english, chinese); });
  return text
    .replace(/Combo Double chance\s*:/i, '组合双重机会：')
    .replace(/Double chance\s*:/i, '双重机会：')
    .replace(/\bor draw\b/gi, '或平局')
    .replace(/\bdraw or\b/gi, '平局或')
    .replace(/\s+and\s+-(\d+(?:\.\d+)?)\s+goals?/i, '，且总进球小于 $1')
    .replace(/\s+and\s+\+(\d+(?:\.\d+)?)\s+goals?/i, '，且总进球大于 $1');
}

export default async function handler(request, response) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const fixtureId = String(request.query.id || '');
  if (!apiKey || !/^\d+$/.test(fixtureId)) return response.status(404).send('比赛页面不存在。');

  const apiFetch = async (path) => {
    const upstream = await fetch(`https://v3.football.api-sports.io/${path}`, { headers: { 'x-apisports-key': apiKey } });
    if (!upstream.ok) throw new Error('upstream failed');
    return upstream.json();
  };

  try {
    const [fixtureData, predictionData] = await Promise.all([apiFetch(`fixtures?id=${fixtureId}`), apiFetch(`predictions?fixture=${fixtureId}`)]);
    let fixture = fixtureData.response?.[0];
    // Some lower-tier fixtures are briefly absent from the single-ID endpoint.
    // Retry the current-day listing before presenting a not-found page.
    if (!fixture) {
      const today = new Date().toISOString().slice(0, 10);
      const dailyData = await apiFetch(`fixtures?date=${today}`);
      fixture = dailyData.response?.find(item => String(item.fixture.id) === fixtureId);
    }
    if (!fixture) return response.status(404).send('未找到这场比赛。');
    const prediction = predictionData.response?.[0]?.predictions;
    const home = cn(fixture.teams.home.name);
    const away = cn(fixture.teams.away.name);
    const league = cn(fixture.league.name);
    const kickoff = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(fixture.fixture.date));
    const noPrediction = !prediction?.percent || /no predictions available/i.test(prediction.advice || '');
    const homeProb = noPrediction ? 33 : pct(prediction.percent.home);
    const drawProb = noPrediction ? 34 : pct(prediction.percent.draw);
    const awayProb = noPrediction ? 33 : pct(prediction.percent.away);
    const advice = noPrediction ? '该场比赛暂未获得足够的赛前模型数据，网站会在数据更新后自动校准。' : localizeAdvice(prediction.advice);
    const title = `${home} vs ${away}预测｜胜平负概率与赛前分析｜球智报`;
    const description = `${league} ${home}对阵${away}，开赛时间：${kickoff}。主胜${homeProb}%、平局${drawProb}%、客胜${awayProb}%；查看球智报赛前数据分析。`;
    const canonical = `https://${request.headers.host}/match/${fixtureId}`;
    const structuredData = JSON.stringify({ '@context': 'https://schema.org', '@type': 'SportsEvent', name: `${home} vs ${away}`, startDate: fixture.fixture.date, url: canonical, homeTeam: { '@type': 'SportsTeam', name: home }, awayTeam: { '@type': 'SportsTeam', name: away }, sport: 'Soccer', description });
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120');
    return response.status(200).send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta name="robots" content="index,follow"><script type="application/ld+json">${structuredData}</script><style>body{margin:0;background:#f4f3ee;color:#17221f;font-family:Arial,"Noto Sans SC",sans-serif}.wrap{max-width:900px;margin:auto;padding:28px 20px 70px}a{color:#17221f}.brand{font-weight:800;text-decoration:none}.brand i{display:inline-block;width:9px;height:9px;border-radius:99px;background:#c9f35c;box-shadow:0 0 0 3px #17221f;margin-right:8px}.crumb{font-size:13px;color:#65706a;margin:52px 0 17px}.label{font-size:12px;color:#65706a;letter-spacing:.06em}.tag{display:inline-block;margin-left:8px;padding:4px 7px;background:#e9efcf;color:#4a554f;font-size:11px}h1{font-size:clamp(34px,7vw,58px);letter-spacing:-.06em;margin:12px 0}p{line-height:1.8}.muted{color:#65706a}.card{background:#fffefa;border:1px solid #d8d9d1;padding:28px;margin-top:28px}.prob{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:10px;margin:25px 0}.prob span{display:block;font-size:13px;color:#65706a}.prob b{display:block;font-size:31px;margin-top:5px}.bar{display:flex;height:8px;border-radius:4px;overflow:hidden}.bar i{display:block}.h{background:#c9f35c;width:${homeProb}%}.d{background:#c8cbc7;width:${drawProb}%}.a{background:#ff745d;width:${awayProb}%}h2{margin-top:32px}.notice{font-size:13px;color:#65706a;border-top:1px solid #d8d9d1;margin-top:32px;padding-top:18px}</style></head><body><main class="wrap"><a class="brand" href="/"><i></i>球智报</a><div class="crumb">首页 / ${escapeHtml(league)} / 赛前分析</div><span class="label">${escapeHtml(league)} · ${escapeHtml(kickoff)}</span><span class="tag">${noPrediction ? '待数据校准' : '数据模型预测'}</span><h1>${escapeHtml(home)} vs ${escapeHtml(away)}</h1><p class="muted">比赛前瞻、胜平负概率与数据模型结论</p><section class="card"><div class="prob"><div><span>主胜</span><b>${homeProb}%</b></div><div><span>平局</span><b>${drawProb}%</b></div><div><span>客胜</span><b>${awayProb}%</b></div></div><div class="bar"><i class="h"></i><i class="d"></i><i class="a"></i></div><h2>AI 赛前结论</h2><p>${escapeHtml(advice)}</p><h2>模型说明</h2><p>概率由数据源的赛前模型提供，并会随比赛信息更新而校准。它反映的是不确定性下的概率判断，不保证赛果。</p><p class="notice">数据更新时间：${escapeHtml(new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))}。内容仅供足球数据分析与娱乐参考，不构成任何建议。</p></section></main></body></html>`);
  } catch {
    return response.status(502).send('比赛数据暂时不可用，请稍后刷新。');
  }
}
