#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)/.tools"
LOCAL_JAVA_HOME="$TOOLS_ROOT/jdk"
LOCAL_MAVEN="$TOOLS_ROOT/maven/bin/mvn"

if [[ -z "${JAVA_HOME:-}" && -x "$LOCAL_JAVA_HOME/bin/java" ]]; then
  export JAVA_HOME="$LOCAL_JAVA_HOME"
fi
MAVEN_BIN="${MAVEN_BIN:-$LOCAL_MAVEN}"
if [[ ! -x "$MAVEN_BIN" ]]; then
  MAVEN_BIN="$(command -v mvn || true)"
fi
JAVA_BIN="${JAVA_HOME:+$JAVA_HOME/bin/}java"

if ! command -v "$JAVA_BIN" >/dev/null 2>&1 && [[ ! -x "$JAVA_BIN" ]]; then
  echo "Java 21 not found" >&2
  exit 1
fi
if [[ -z "$MAVEN_BIN" || ! -x "$MAVEN_BIN" ]]; then
  echo "Maven not found" >&2
  exit 1
fi

cd "$PROJECT_ROOT/backend"
"$MAVEN_BIN" -DskipTests package

RUNTIME_DIR="$PROJECT_ROOT/runtime"
RUNTIME_NEXT="$RUNTIME_DIR/reddot-backend.jar.next"
mkdir -p "$RUNTIME_DIR"
cp "$PROJECT_ROOT/backend/target/reddot-backend.jar" "$RUNTIME_NEXT"
mv "$RUNTIME_NEXT" "$RUNTIME_DIR/reddot-backend.jar"
echo "Runtime artifact published: $RUNTIME_DIR/reddot-backend.jar"
