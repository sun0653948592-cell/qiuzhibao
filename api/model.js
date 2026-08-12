// 球智报自有胜平负模型 v0.1
// 输入：联赛积分榜中的积分、主客场战绩、进失球和最近 5 场状态。
// 这是一套可解释的赛前基线模型，后续会用历史赛果回测并校准参数。
const number = value => Number(value || 0);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function pointsPerGame(record) {
  const played = number(record?.played);
  return played ? (number(record.win) * 3 + number(record.draw)) / played : 1;
}

function goalDifferencePerGame(record) {
  const played = number(record?.played);
  return played ? (number(record.goals?.for) - number(record.goals?.against)) / played : 0;
}

function formScore(form) {
  const points = { W: 3, D: 1, L: 0 };
  const games = String(form || '').slice(-5).split('').filter(result => points[result] !== undefined);
  return games.length ? games.reduce((sum, result) => sum + points[result], 0) / games.length : 1;
}

function softmax(values) {
  const max = Math.max(...values);
  const weights = values.map(value => Math.exp(value - max));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map(value => value / total);
}

function percentages(values) {
  const result = values.map(value => Math.round(value * 100));
  result[1] += 100 - result.reduce((sum, value) => sum + value, 0);
  return result;
}

export function buildPrediction(homeId, awayId, standings) {
  const table = standings?.[0] || [];
  const home = table.find(team => Number(team.team?.id) === Number(homeId));
  const away = table.find(team => Number(team.team?.id) === Number(awayId));
  if (!home || !away) return null;

  // 主队只取主场数据、客队只取客场数据；这比直接使用总成绩更贴近比赛场景。
  const homePpg = pointsPerGame(home.home);
  const awayPpg = pointsPerGame(away.away);
  const homeGoalDiff = goalDifferencePerGame(home.home);
  const awayGoalDiff = goalDifferencePerGame(away.away);
  const formDiff = formScore(home.form) - formScore(away.form);
  const strengthDiff = (homePpg - awayPpg) * 0.9 + (homeGoalDiff - awayGoalDiff) * 0.35 + formDiff * 0.18;

  // 0.28 是固定主场加成；平局在实力接近时更高。
  const homeLogit = 0.28 + strengthDiff;
  const awayLogit = -strengthDiff;
  const drawLogit = 0.58 - Math.abs(strengthDiff) * 0.35;
  const [homeProbability, drawProbability, awayProbability] = percentages(softmax([homeLogit, drawLogit, awayLogit]));
  const certainty = clamp(Math.abs(strengthDiff), 0, 1.2);
  const label = number(home.all?.played) >= 8 && number(away.all?.played) >= 8 ? '球智报模型 v0.1' : '球智报模型（样本较少）';
  const favourite = homeProbability >= awayProbability ? '主队' : '客队';
  const topProbability = Math.max(homeProbability, drawProbability, awayProbability);
  const advice = topProbability <= 38
    ? '双方数据接近，模型认为本场不确定性较高，平局概率需要重点关注。'
    : `${favourite}的主客场表现、进失球效率与近期状态综合评分更高，模型倾向${favourite}不败。`;

  return {
    percent: { home: `${homeProbability}%`, draw: `${drawProbability}%`, away: `${awayProbability}%` },
    advice,
    label,
    inputs: { homePpg: homePpg.toFixed(2), awayPpg: awayPpg.toFixed(2), homeGoalDiff: homeGoalDiff.toFixed(2), awayGoalDiff: awayGoalDiff.toFixed(2), certainty: certainty.toFixed(2) }
  };
}
