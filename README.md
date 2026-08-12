# 球智报（第一版）

这是一个每日足球 AI 分析新闻网站的前端原型，当前使用示例比赛数据以便立即预览。

## 当前完成

- 中文新闻风格首页，含联赛筛选和移动端布局
- 单场胜平负概率卡片及 AI 解读弹窗
- `api/fixtures.js`：为 Vercel 准备的服务端 API-Football 代理；密钥不会发送给浏览器
- `.env.example`：环境变量模板

## 本地预览

直接双击 `index.html` 即可在浏览器查看页面。

## 接入真实数据

1. 在 API-Football 注册免费账户并取得 API Key。
2. 部署到 Vercel 后，在项目的 Environment Variables 中新增 `API_FOOTBALL_KEY`。
3. 后续将 `app.js` 的示例数据改为请求 `/api/fixtures`，再增加一个每天定时生成预测文章的任务。

免费套餐每天 100 次请求。第一版只拉取 5–10 场焦点比赛并将结果缓存到自己的数据库，即可控制在额度内。
