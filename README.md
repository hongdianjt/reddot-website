# 红点创芯企业官网

## 本地启动

本项目已在工作区 `.tools/node` 中准备 Node.js 24 LTS。执行：

```bash
export PATH="/Users/hongdian/Documents/Obsidian/石江辉/.tools/node/bin:$PATH"
cd /Users/hongdian/Documents/Obsidian/石江辉/reddot-website
npm start
```

- 官网：`http://localhost:3000/`
- 管理后台：`http://localhost:3000/admin/`
- 默认后台密码：`red-dot-admin-2026`（仅用于本地演示；部署前必须在 `.env` 中更换）

## 当前实现

- 前台：首页、独立的关于我们页、解决方案列表及详情、代理品牌列表、新闻资讯。
- 关于我们：企业简介图文/视频、企业文化切换、支持搜索、筛选、悬浮和点击锁定的集团分布地图；同城公司自动聚合显示数量。
- 后台：全局设置、关于我们媒体、解决方案、代理品牌、新闻、集团业务平台、企业文化、集团分布地图的内容编辑与默认数据恢复。
- 服务端：Express REST API 与首次启动自动生成的 `data/site.json` 数据文件。
- 首页：深色可配置 Hero、进入第二屏后白底黑字的吸顶导航、浅色红品牌内容区和动态星链集团业务平台。

部署请查看 [DEPLOYMENT.md](DEPLOYMENT.md)。
