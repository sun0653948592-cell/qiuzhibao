const sampleMatches = [
  { id: 1, league: "英超", time: "今晚 22:00", home: "阿森纳", away: "切尔西", homeProb: 48, drawProb: 27, awayProb: 25, confidence: "中等置信", insight: "主队近 5 场攻防数据占优，但德比属性令平局风险上升。", analysis: "阿森纳近期在主场保持稳定的进攻输出，近五场的进失球表现优于对手。切尔西客场波动较大，因此模型稍偏向主胜；两队实力接近，平局仍是需要保留的重要结果。" },
  { id: 2, league: "西甲", time: "今晚 23:30", home: "皇家马德里", away: "皇家社会", homeProb: 57, drawProb: 24, awayProb: 19, confidence: "较高置信", insight: "主场优势与近期状态形成双重支撑，客队防守韧性是关键变量。", analysis: "皇家马德里的主场表现和整体进球效率为模型提供了较强支撑。皇家社会具备防守组织能力，可能压低比赛节奏；若主队早早破门，胜率将继续上升。" },
  { id: 3, league: "欧冠", time: "明日 03:00", home: "拜仁慕尼黑", away: "国际米兰", homeProb: 42, drawProb: 29, awayProb: 29, confidence: "低置信", insight: "两队整体强度接近，模型判断这是一场高不确定性对决。", analysis: "双方近期的综合实力接近，模型无法得出明显单边结论。拜仁主场进攻有优势，国际米兰的比赛控制力与防守质量使客胜概率不低，赛前首发将显著影响最终预测。" }
];

// 常见联赛与球队的固定中文译名。没有收录的队名保留官方英文，避免机器翻译出错。
const chineseNames = {
  'Premier League': '英超', 'La Liga': '西甲', 'Serie A': '意甲', 'Bundesliga': '德甲', 'Ligue 1': '法甲',
  'UEFA Champions League': '欧冠', 'UEFA Europa League': '欧联杯', 'UEFA Europa Conference League': '欧协联',
  'Club Friendlies': '国际友谊赛', 'Friendlies Clubs': '俱乐部友谊赛', 'Cup': '杯赛',
  'Arsenal': '阿森纳', 'Chelsea': '切尔西', 'Liverpool': '利物浦', 'Manchester City': '曼城',
  'Manchester United': '曼联', 'Tottenham': '热刺', 'Newcastle': '纽卡斯尔联', 'Aston Villa': '阿斯顿维拉',
  'Real Madrid': '皇家马德里', 'Barcelona': '巴塞罗那', 'Atletico Madrid': '马德里竞技', 'Real Sociedad': '皇家社会',
  'Bayern Munich': '拜仁慕尼黑', 'Borussia Dortmund': '多特蒙德', 'Bayer Leverkusen': '勒沃库森',
  'Inter': '国际米兰', 'Inter Milan': '国际米兰', 'AC Milan': 'AC米兰', 'Juventus': '尤文图斯', 'Napoli': '那不勒斯',
  'Paris Saint Germain': '巴黎圣日耳曼', 'Marseille': '马赛', 'Monaco': '摩纳哥',
  'FK Kukesi': '库克斯', 'Besa Kavajë': '贝萨卡瓦耶', 'East Bengal II': '东孟加拉二队',
  'Al Arabi': '阿拉比', 'Amkar': '阿姆卡尔', 'Pobeda Nizhny Novgorod': '下诺夫哥罗德波别达'
};

function toChineseName(name) {
  return chineseNames[name] || name;
}

const grid = document.querySelector('#matchGrid');
const template = document.querySelector('#matchTemplate');
const dialog = document.querySelector('#analysisDialog');
const dialogContent = document.querySelector('#dialogContent');

function render(matches) {
  grid.innerHTML = '';
  matches.forEach(match => {
    const card = template.content.cloneNode(true);
    card.querySelector('.league').textContent = match.league;
    card.querySelector('time').textContent = match.time;
    card.querySelector('.confidence').textContent = match.confidence;
    card.querySelector('.home').textContent = match.home;
    card.querySelector('.away').textContent = match.away;
    card.querySelector('.home-prob').textContent = `${match.homeProb}%`;
    card.querySelector('.draw-prob').textContent = `${match.drawProb}%`;
    card.querySelector('.away-prob').textContent = `${match.awayProb}%`;
    card.querySelector('.home-bar').style.width = `${match.homeProb}%`;
    card.querySelector('.draw-bar').style.width = `${match.drawProb}%`;
    card.querySelector('.away-bar').style.width = `${match.awayProb}%`;
    card.querySelector('.insight').textContent = match.insight;
    card.querySelector('.read-analysis').addEventListener('click', () => showAnalysis(match));
    grid.appendChild(card);
  });
  document.querySelector('#matchCount').textContent = matches.length;
}

function showAnalysis(match) {
  dialogContent.innerHTML = `<span class="dialog-league">${match.league} · ${match.time}</span><h2>${match.home} vs ${match.away}</h2><div class="dialog-prob"><span>主胜 ${match.homeProb}%</span><span>平局 ${match.drawProb}%</span><span>客胜 ${match.awayProb}%</span></div><p>${match.analysis}</p><p><b>模型提示：</b>${match.confidence}。实际首发、伤停或临场状态可能改变预测。</p>`;
  dialog.showModal();
}

document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelector('.filter.active').classList.remove('active');
  button.classList.add('active');
  const league = button.dataset.league;
  render(league === 'all' ? sampleMatches : sampleMatches.filter(match => match.league === league));
}));

function formatKickoff(isoTime) {
  const kickoff = new Date(isoTime);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const label = kickoff.toDateString() === today.toDateString() ? '今天' : kickoff.toDateString() === tomorrow.toDateString() ? '明天' : `${kickoff.getMonth() + 1}/${kickoff.getDate()}`;
  return `${label} ${kickoff.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function createInitialAnalysis(home, away) {
  return {
    homeProb: 39, drawProb: 29, awayProb: 32,
    confidence: '待数据校准',
    insight: '真实赛程已同步。AI 正在结合球队近期表现生成赛前判断。',
    analysis: `${home} 对阵 ${away} 的基础赛程信息已同步。首版模型将在接入双方近期战绩、主客场表现和伤停信息后，生成可复盘的胜平负概率。`
  };
}

function fromApiFixture(item) {
  const home = toChineseName(item.teams.home.name);
  const away = toChineseName(item.teams.away.name);
  const basic = createInitialAnalysis(home, away);
  return {
    id: item.fixture.id,
    league: toChineseName(item.league.name),
    time: formatKickoff(item.fixture.date),
    home,
    away,
    ...basic
  };
}

async function loadTodayFixtures() {
  try {
    const response = await fetch('/api/fixtures', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('fixtures unavailable');
    const payload = await response.json();
    const matches = (payload.response || [])
      .filter(item => item.fixture.status.short === 'NS')
      .slice(0, 30)
      .map(fromApiFixture);
    if (!matches.length) throw new Error('no scheduled fixtures');
    render(matches);
    document.querySelector('.hero-meta span:first-child').innerHTML = '<i></i> 真实赛程已同步';
  } catch {
    render(sampleMatches);
  }
}

document.querySelector('#todayDate').textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
loadTodayFixtures();
