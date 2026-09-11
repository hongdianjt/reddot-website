# 阿里云部署说明（Java + MySQL）

## 推荐架构

- Alibaba Cloud Linux 3 或 Ubuntu 24.04 LTS，2 核 4GB 起
- Java 21 LTS
- MySQL 8.4 LTS；生产环境优先使用阿里云 RDS MySQL
- Nginx 反向代理 Java 服务
- systemd 守护 Spring Boot 进程

安全组仅对外开放 `80`、`443` 和限制来源的 `22`。不要将 Java 的 `3000` 端口或 MySQL `3306` 端口直接暴露到公网。

## 服务器环境

Alibaba Cloud Linux 3：

```bash
sudo dnf install -y java-21-openjdk-devel maven nginx mysql
```

Ubuntu：

```bash
sudo apt-get update
sudo apt-get install -y openjdk-21-jdk maven nginx mysql-client
```

如使用 RDS，请在 RDS 控制台创建 `reddot_website` 数据库和仅拥有该库权限的专用账号，并将 ECS 内网 IP 加入白名单。

## 发布和配置

```bash
sudo useradd --system --home /srv/reddot-website --shell /sbin/nologin reddot
sudo git clone https://github.com/hongdianjt/reddot-website.git /srv/reddot-website
sudo chown -R reddot:reddot /srv/reddot-website
cd /srv/reddot-website
MAVEN_BIN=/usr/bin/mvn ./scripts/build-java.sh
cp .env.example .env
```

编辑 `.env`，填入后台密码哈希与 MySQL/RDS 内网连接信息：

```dotenv
PORT=3000
ADMIN_USERNAME=独立管理员账号
ADMIN_PASSWORD_HASH=scrypt:随机盐:128位十六进制哈希
DB_HOST=RDS内网地址
DB_PORT=3306
DB_NAME=reddot_website
DB_USERNAME=reddot_app
DB_PASSWORD=高强度数据库密码
WEB_ROOT=/srv/reddot-website
SEED_FILE=/srv/reddot-website/data/site.json
```

```bash
sudo chown reddot:reddot /srv/reddot-website/.env
sudo chmod 600 /srv/reddot-website/.env
sudo mkdir -p /srv/reddot-website/assets/uploads
sudo chown -R reddot:reddot /srv/reddot-website/assets/uploads
```

如需将旧 JSON 内容首次导入，在启动前将备份放到 `data/site.json`。仅当 MySQL 的 `site_setting` 为空时才会自动导入，不会覆盖已有数据。

## 启动服务

```bash
sudo cp deploy/reddot-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now reddot-backend
sudo systemctl status reddot-backend
```

复用 `deploy/nginx-reddot.conf`，将域名替换为正式域名后：

Nginx 示例已将 `client_max_body_size` 设为 `101m`，与后台最大 100MB 视频上传规则保持一致。

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

完成 DNS 解析后配置 HTTPS。

## 备份

生产环境开启 RDS 自动备份和日志备份，同时定期备份：

- MySQL `reddot_website` 数据库
- `/srv/reddot-website/assets/uploads` 媒体文件
- `.env` 的安全离线副本

更新代码时先备份，再执行 `git pull`、`MAVEN_BIN=/usr/bin/mvn ./scripts/build-java.sh` 和 `systemctl restart reddot-backend`。构建脚本会原子替换 `runtime/reddot-backend.jar`，避免覆盖运行中的 JAR。Flyway 会自动执行新的版本化 SQL 迁移。
