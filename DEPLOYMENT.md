# 阿里云部署说明

当前项目是 Node.js 服务，默认使用 `data/site.json` 保存后台内容；适合首期官网与内容管理上线。数据目录必须纳入服务器备份。正式生产阶段建议将该文件存储层替换为 MySQL 8，前台接口不变。

## 服务器准备

建议使用 Alibaba Cloud Linux 3 或 Ubuntu 22.04 LTS，至少 2 核 4GB 内存。安全组开放 `80`、`443` 和管理用 `22` 端口，不直接对公网开放 `3000`。

安装 Node.js LTS、Nginx 与 PM2：

```bash
curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
sudo dnf install -y nodejs nginx
sudo npm install -g pm2
```

Ubuntu 将 `dnf` 替换为 `apt-get`，并使用 NodeSource 的 Debian 安装脚本。

## 发布

```bash
git clone <your-repository-url> /srv/reddot-website
cd /srv/reddot-website
npm ci --omit=dev
cp .env.example .env
```

编辑 `.env`，设置独立的 `ADMIN_USERNAME` 与 scrypt 格式的 `ADMIN_PASSWORD_HASH`。不要在代码、文档或 Git 仓库中保存明文密码。然后启动：

```bash
set -a && source .env && set +a
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

将 `deploy/nginx-reddot.conf` 中的域名替换为正式域名，复制到 `/etc/nginx/conf.d/reddot.conf` 后执行：

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

完成 DNS 解析后，使用 Certbot 配置 HTTPS。上线后访问 `/admin/`，使用与 `.env` 密码哈希对应的后台密码登录。

## 备份与更新

每日备份 `/srv/reddot-website/data/site.json`，并将备份保存到 OSS。更新前先备份数据，再拉取代码、执行 `npm ci --omit=dev` 和 `pm2 reload reddot-website`。
