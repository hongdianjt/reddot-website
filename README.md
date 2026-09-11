# 红点创芯企业官网

官网前端为原生 HTML/CSS/JavaScript，后端为 Java 21 + Spring Boot 3.5，内容、地图、登录会话等数据持久化到 MySQL 8.4。

## 本地环境

工作区已安装：

- Java 21：`../.tools/jdk`
- Maven 3.9：`../.tools/maven`
- MySQL 8.4 LTS：`../.tools/mysql`
- MySQL 本地端口：`127.0.0.1:3307`

数据库和后台密码仅保存在本机 `.env`，该文件已被 Git 忽略。

```bash
./scripts/mysql-local.sh start
./scripts/build-java.sh
export PATH="/Users/hongdian/Documents/Obsidian/石江辉/.tools/node/bin:$PATH"
node_modules/pm2/bin/pm2 startOrReload ecosystem.config.cjs
```

构建脚本会将 Maven 产物原子发布到 `runtime/reddot-backend.jar`，运行中的服务不会因重新构建而被覆盖。

- 官网：`http://localhost:3000/`
- 管理后台：`http://localhost:3000/admin/`

## 数据持久化

Flyway 启动时自动执行 `backend/src/main/resources/db/migration` 中的数据库迁移。第一次连接空数据库时，Java 后端会将原 `data/site.json` 数据导入 MySQL；导入后所有前后台读写均以 MySQL 为准，不再写入 JSON。

主要数据表：

- `site_setting`：首页、关于我们和媒体配置
- `content_item`：解决方案、新闻、代理品牌、集团平台
- `distribution_city` / `company`：集团城市与公司分布
- `capability`：全流程能力
- `admin_session` / `login_attempt`：持久化后台会话与登录限流

阿里云上线见 [DEPLOYMENT.md](DEPLOYMENT.md)。
