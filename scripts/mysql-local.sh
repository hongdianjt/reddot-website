#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)/.tools"
MYSQL_BASE="${MYSQL_BASE:-$TOOLS_ROOT/mysql}"
MYSQL_DATA="${MYSQL_DATA:-$TOOLS_ROOT/mysql-data}"
MYSQL_PORT="${DB_PORT:-3307}"

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

MYSQL_PORT="${DB_PORT:-$MYSQL_PORT}"
MYSQL_USER="${DB_USERNAME:-root}"

mysql_ping() {
  MYSQL_PWD="${DB_PASSWORD:-}" "$MYSQL_BASE/bin/mysqladmin" --protocol=tcp -h127.0.0.1 -P"$MYSQL_PORT" -u"$MYSQL_USER" ping >/dev/null 2>&1
}

start_mysql() {
  if mysql_ping; then
    echo "MySQL is already running on 127.0.0.1:$MYSQL_PORT"
    return
  fi
  "$MYSQL_BASE/bin/mysqld" --no-defaults --basedir="$MYSQL_BASE" --datadir="$MYSQL_DATA" --port="$MYSQL_PORT" --socket="$MYSQL_DATA/mysql.sock" --pid-file="$MYSQL_DATA/mysql.pid" --log-error="$MYSQL_DATA/mysql.log" --bind-address=127.0.0.1 --mysqlx=0 --daemonize
  for _ in {1..20}; do
    mysql_ping && { echo "MySQL started"; return; }
    sleep 1
  done
  echo "MySQL failed to start; see $MYSQL_DATA/mysql.log" >&2
  exit 1
}

case "${1:-start}" in
  start) start_mysql ;;
  status) mysql_ping && echo "MySQL is running on 127.0.0.1:$MYSQL_PORT" ;;
  *) echo "Usage: $0 {start|status}" >&2; exit 2 ;;
esac
