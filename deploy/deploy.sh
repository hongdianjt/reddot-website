#!/usr/bin/env bash
#
# 红点创芯官网 一键部署脚本（Java + systemd + Nginx）
# 适用系统：Alibaba Cloud Linux 3/4（dnf）
# 架构：前端静态页面由 Spring Boot 后端 serve，Nginx 反向代理 3000 端口
#
# 首次执行：
#   sudo bash deploy/deploy.sh init        # 初始化服务器环境并完成全部部署
#
# 更新代码：
#   sudo bash deploy/deploy.sh update      # git pull + 构建 + 重启后端 + 重载 nginx
#
# 单独查看状态：
#   sudo bash deploy/deploy.sh status
#
# 可选环境变量（按需覆盖）：
#   DOMAIN=www.example.com \
#   DB_PASSWORD=<高强度数据库密码> \
#   ADMIN_USERNAME=<管理员账号> \
#   ADMIN_PASSWORD_HASH=<scrypt:盐:哈希> \
#   sudo bash deploy/deploy.sh init

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
ADMIN_USERNAME="${ADMIN_USERNAME:-}"
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
  if [[ -n "${DB_PASSWORD}" ]]; then
    pass="${DB_PASSWORD}"
  else
    warn "未设置 DB_PASSWORD，请稍后编辑 .env 补充数据库密码，或使用环境变量传入。"
    # 生成一个随机密码并作为默认值，避免流程中断
    pass="$(openssl rand -hex 12)"
    info "已生成本地数据库密码：${pass}"
  fi
  info "创建数据库 reddot_website 与账号 reddot_app ..."
  mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS reddot_website DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'reddot_app'@'localhost' IDENTIFIED BY '${pass}';
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
  [[ -n "${ADMIN_USERNAME}" && -n "${ADMIN_PASSWORD_HASH}" ]] \
    || die "首次部署必须提供 ADMIN_USERNAME 与 ADMIN_PASSWORD_HASH（环境变量），用于后台登录。吊销需注意安全。"

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
  if [[ ! -f "${unit}" ]]; then
    info "安装 systemd 单元 ${unit} ..."
    cp "${APP_HOME}/deploy/reddot-backend.service" "${unit}"
  fi
  systemctl daemon-reload
  systemctl enable --now reddot-backend
  info "systemd 服务已启动"
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
  *)
    echo "用法：sudo bash deploy/deploy.sh {init|update|status}"
    exit 1
    ;;
esac