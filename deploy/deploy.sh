#!/usr/bin/env bash
#
# 红点创芯官网 一键部署脚本（Java + systemd + Nginx）
# 适用系统：Alibaba Cloud Linux 3/4（dnf）
# 架构：前端静态页面由 Spring Boot 后端 serve，Nginx 反向代理 3000 端口
#
# 首次执行（需提供管理员密码哈希；用户名默认 adminreddote，可覆盖）：
#   DOMAIN=域名或IP DB_PASSWORD=数据库密码 ADMIN_PASSWORD_HASH='scrypt:盐:哈希' \
#   sudo bash deploy/deploy.sh init
#
# 日常命令（全部无需参数，自动读取已有 .env）：
#   sudo bash deploy/deploy.sh init      # 重新应用配置 + 构建 + 重启（幂等，可重复执行）
#   sudo bash deploy/deploy.sh update    # git pull + 构建 + 重启后端 + 重载 nginx
#   sudo bash deploy/deploy.sh restart   # 仅重启服务（不构建），最快
#   sudo bash deploy/deploy.sh logs      # 实时查看后端日志
#   sudo bash deploy/deploy.sh status    # 查看服务状态与探活

set -euo pipefail

# ============================ 常量 ============================
APP_NAME="reddot-website"
APP_USER="reddot"
APP_HOME="/srv/${APP_NAME}"
REPO_URL="https://github.com/hongdianjt/reddot-website.git"
BUILD_SCRIPT="${APP_HOME}/scripts/build-java.sh"

# 用户可覆盖
DOMAIN="${DOMAIN:-example.com}"
DB_PASSWORD="${DB_PASSWORD:-}"
ADMIN_USERNAME="${ADMIN_USERNAME:-adminreddote}"
ADMIN_PASSWORD_HASH="${ADMIN_PASSWORD_HASH:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "请使用 sudo 执行，例如：sudo bash deploy/deploy.sh init"
}

is_installed() {
  command -v "$1" >/dev/null 2>&1
}

# ============================ 1. 环境初始化 ============================
install_deps() {
  info "启用 EPEL（提供 nginx 等软件包）..."
  dnf install -y epel-release || warn "EPEL 启用失败，若系统自带 nginx 可忽略"
  info "安装系统依赖（java-21-openjdk-devel / maven / nginx / mysql-server）..."
  dnf install -y java-21-openjdk-devel maven nginx mysql-server git openssl curl
  info "系统依赖安装完成"
}

# ============================ 2. 拉取/更新代码 ============================
clone_or_update() {
  mkdir -p "${APP_HOME}"
  # 仓库属主为 reddot 服务用户，root 执行 git 时需加入安全目录例外
  git config --global --add safe.directory "${APP_HOME}" 2>/dev/null || true
  if [[ -d "${APP_HOME}/.git" ]]; then
    info "检测到已有代码，执行 git pull 更新..."
    git -C "${APP_HOME}" pull --ff-only
  else
    info "克隆代码到 ${APP_HOME} ..."
    git clone "${REPO_URL}" "${APP_HOME}"
  fi
}

create_service_user() {
  # 确保目录存在，避免后续 chown 因目录缺失失败
  mkdir -p "${APP_HOME}"
  if ! id "${APP_USER}" >/dev/null 2>&1; then
    info "创建服务用户 ${APP_USER} ..."
    useradd --system --home "${APP_HOME}" --shell /sbin/nologin "${APP_USER}"
  fi
  chown -R "${APP_USER}:${APP_USER}" "${APP_HOME}"
  mkdir -p "${APP_HOME}/assets/uploads"
  chown -R "${APP_USER}:${APP_USER}" "${APP_HOME}/assets/uploads"
}

# ============================ 3. 初始化数据库 ============================
ensure_database() {
  # 仅当使用本机 MySQL 时针对 reddot_app 建库授权；若使用 RDS 请忽略并在 RDS 控制台手动创建。
  if is_installed mysql; then
    if ! systemctl is-active --quiet mysqld 2>/dev/null; then
      info "启动本机 MySQL 服务（首次安装需初始化）..."
      systemctl enable --now mysqld
      for _ in $(seq 1 30); do
        mysqladmin --silent ping 2>/dev/null && break
        sleep 1
      done
    fi
  else
    warn "未检测到本机 MySQL，跳过数据库初始化。如使用 RDS，请在控制台手动创建库与账号。"
    return
  fi
  local pass
  local env_file="${APP_HOME}/.env"
  if [[ -z "${DB_PASSWORD}" && -f "${env_file}" ]]; then
    # 未传参时从现有 .env 读取，保证与后端配置始终一致
    DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "${env_file}" | head -1 | cut -d= -f2-)"
    [[ -n "${DB_PASSWORD}" ]] && info "从已有 .env 读取数据库密码"
  fi
  if [[ -n "${DB_PASSWORD}" ]]; then
    pass="${DB_PASSWORD}"
  else
    warn "未设置 DB_PASSWORD，自动生成随机密码（已同步写入后续 .env）"
    pass="$(openssl rand -hex 12)"
    info "已生成本地数据库密码：${pass}"
  fi
  info "创建数据库 reddot_website 与账号 reddot_app ..."
  mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS reddot_website DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'reddot_app'@'localhost' IDENTIFIED BY '${pass}';
ALTER USER 'reddot_app'@'localhost' IDENTIFIED BY '${pass}';
GRANT ALL PRIVILEGES ON reddot_website.* TO 'reddot_app'@'localhost';
FLUSH PRIVILEGES;
SQL
  export DB_PASSWORD="${pass}"
  info "数据库初始化完成"
}

# ============================ 4. 生成 .env ============================
configure_env() {
  local env_file="${APP_HOME}/.env"
  if [[ -f "${env_file}" ]]; then
    info "已存在 .env，保留现有配置"
    return
  fi
  [[ -n "${ADMIN_PASSWORD_HASH}" ]] \
    || die "首次部署必须提供 ADMIN_PASSWORD_HASH（scrypt:盐:哈希），用于后台登录。用户名默认 adminreddote。"

  info "生成 ${env_file} ..."
  local mysql_root="${MYSQL_ROOT_PASSWORD:-replace-with-local-root-password}"
  cat > "${env_file}" <<EOF
PORT=3000
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=reddot_website
DB_USERNAME=reddot_app
DB_PASSWORD=${DB_PASSWORD}
WEB_ROOT=${APP_HOME}
SEED_FILE=${APP_HOME}/data/site.json
MYSQL_ROOT_PASSWORD=${mysql_root}
EOF
  chown "${APP_USER}:${APP_USER}" "${env_file}"
  chmod 600 "${env_file}"
  info ".env 配置完成（请确认 ADMIN_PASSWORD_HASH 是 scrypt 格式）"
}

# ============================ 5. 构建 ============================
build_backend() {
  # 国内网络加速：如未配置 Maven 镜像，写入阿里云镜像
  local mvn_settings="${HOME}/.m2/settings.xml"
  if [[ ! -f "${mvn_settings}" ]]; then
    info "写入阿里云 Maven 镜像配置（${mvn_settings}）..."
    mkdir -p "$(dirname "${mvn_settings}")"
    cat > "${mvn_settings}" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <mirrors>
    <mirror>
      <id>aliyunmaven</id>
      <mirrorOf>central</mirrorOf>
      <name>Aliyun Maven Mirror</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
XML
  fi
  info "构建后端 JAR（mvn package -> runtime/reddot-backend.jar）..."
  if [[ -z "${JAVA_HOME:-}" ]]; then
    for d in /usr/lib/jvm/java-21-openjdk /usr/lib/jvm/java-21; do
      if [[ -d "$d" ]]; then export JAVA_HOME="$d"; break; fi
    done
  fi
  MAVEN_BIN="$(command -v mvn)" bash "${BUILD_SCRIPT}"
  chown -R "${APP_USER}:${APP_USER}" "${APP_HOME}/runtime"
  info "后端构建完成"
}

# ============================ 6. 注册并启动 systemd 服务 ============================
install_systemd_service() {
  local unit="/etc/systemd/system/reddot-backend.service"
  info "安装/更新 systemd 单元 ${unit} ..."
  # 系统默认 java 可能是老版本（如阿里云预装 Dragonwell 8），优先解析 java-21 完整路径
  local java_bin="/usr/bin/java"
  if ! /usr/bin/java -version 2>&1 | grep -q 'version "21'; then
    local j21
    j21="$(ls -d /usr/lib/jvm/java-21-openjdk*/bin/java 2>/dev/null | head -1 || true)"
    if [[ -n "${j21}" ]]; then
      java_bin="${j21}"
      info "检测到 /usr/bin/java 非 21 版本，改用 ${java_bin}"
    fi
  fi
  # 每次都从模板重新生成，确保修复已存在的旧单元文件
  sed "s|ExecStart=/usr/bin/java|ExecStart=${java_bin}|" \
    "${APP_HOME}/deploy/reddot-backend.service" > "${unit}"
  systemctl daemon-reload
  systemctl enable --now reddot-backend
  systemctl restart reddot-backend
  info "systemd 服务已启动（java: ${java_bin}）"
}

# ============================ 7. 配置并启动 Nginx ============================
install_nginx() {
  local conf="/etc/nginx/conf.d/reddot-website.conf"
  if [[ -f "${conf}" ]]; then
    info "已存在 nginx 配置，保留"
  else
    # DOMAIN 若为 IP 则不加 www 前缀
    local server_names
    if [[ "${DOMAIN}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      server_names="${DOMAIN}"
    else
      server_names="${DOMAIN} www.${DOMAIN}"
    fi
    info "根据部署模板生成 nginx 配置（server_name：${server_names}）..."
    sed "s/server_name example.com www.example.com;/server_name ${server_names};/" \
      "${APP_HOME}/deploy/nginx-reddot.conf" > "${conf}"
  fi
  nginx -t || die "nginx 配置测试失败"
  systemctl enable --now nginx
  systemctl reload nginx 2>/dev/null || systemctl restart nginx
  info "Nginx 已启动并反向代理到 127.0.0.1:3000"
}

# ============================ 8. 状态检查 ============================
show_status() {
  systemctl status reddot-backend --no-pager || true
  systemctl status nginx --no-pager || true
  curl -fsS -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:3000" \
    && info "后端本地探活成功 (127.0.0.1:3000)" || warn "后端探活失败，请查看日志：journalctl -u reddot-backend -f"
}

# ============================ 主流程 ============================
CMD="${1:-}"
require_root

case "${CMD}" in
  init)
    install_deps
    clone_or_update
    create_service_user
    ensure_database
    configure_env
    build_backend
    install_systemd_service
    install_nginx
    show_status
    info "部署完成。请检查下列事项："
    echo "  1) 确认 ${APP_HOME}/.env 中的 ADMIN_PASSWORD_HASH 与 DB_PASSWORD 符合预期"
    echo "  2) 如使用 RDS，请将 DB_HOST/DB_PORT 改为 RDS 内网地址并确认白名单，然后：systemctl restart reddot-backend"
    echo "  3) 配置 DNS / HTTPS：certbot 或阿里云证书服务，然后修改 nginx 配置并 reloadNginx"
    ;;
  update)
    clone_or_update
    create_service_user
    build_backend
    systemctl daemon-reload
    systemctl restart reddot-backend
    systemctl reload nginx 2>/dev/null || true
    show_status
    info "更新完成。"
    ;;
  status)
    show_status
    ;;
  restart)
    systemctl restart reddot-backend
    systemctl reload nginx 2>/dev/null || true
    info "已重启后端与 nginx，10 秒后探活..."
    sleep 10
    show_status
    ;;
  logs)
    journalctl -u reddot-backend -n 100 --no-pager
    echo "--- 实时日志（Ctrl+C 退出）---"
    journalctl -u reddot-backend -f --no-pager
    ;;
  *)
    echo "用法：sudo bash deploy/deploy.sh {init|update|restart|logs|status}"
    exit 1
    ;;
esac