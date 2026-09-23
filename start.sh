#!/usr/bin/env bash
#
# Installs dependencies, creates default config and starts the Notes app
# (NestJS backend + Vite/React frontend). Press Ctrl+C to stop both.
#
# Environment overrides (optional):
#   PORT            backend port (default: value in backend/.env, else 3000)
#   FRONTEND_PORT   frontend port (default: 5173)
#   DB_PATH         SQLite file, relative to backend/ (default: notes.sqlite)
#   SKIP_INSTALL=1  skip "npm install" (useful when dependencies are present)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
MIN_NODE_VERSION="20.19.0"

BACKEND_PID=""
FRONTEND_PID=""

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
fail() {
  printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2
  exit 1
}

# ---------------------------------------------------------------- prerequisites

command -v node >/dev/null 2>&1 ||
  fail "Node.js is not installed. Install Node.js >= $MIN_NODE_VERSION from https://nodejs.org and try again."
command -v npm >/dev/null 2>&1 ||
  fail "npm is not installed. It ships with Node.js: https://nodejs.org"

NODE_VERSION="$(node -p 'process.versions.node')"
node -e '
  const [a, b] = [process.argv[1], process.argv[2]].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) process.exit(a[i] > b[i] ? 0 : 1); }
' "$NODE_VERSION" "$MIN_NODE_VERSION" ||
  fail "Node.js $NODE_VERSION is too old. Version >= $MIN_NODE_VERSION is required."
ok "Node.js $NODE_VERSION, npm $(npm -v)"

# ------------------------------------------------------------------ config files

random_secret() {
  node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))'
}

if [ ! -f "$BACKEND_DIR/.env" ]; then
  info "Creating backend/.env with default values"
  cat >"$BACKEND_DIR/.env" <<EOF
PORT=3000
DB_PATH=notes.sqlite
JWT_SECRET=$(random_secret)
JWT_EXPIRES_IN=86400
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
EOF
fi

# Read a KEY=value from a .env file (empty when missing).
env_value() {
  grep -E "^$1=" "$2" 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d '\r' || true
}

BACKEND_PORT="${PORT:-$(env_value PORT "$BACKEND_DIR/.env")}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
export PORT="$BACKEND_PORT"

if [ ! -f "$FRONTEND_DIR/.env" ]; then
  info "Creating frontend/.env with default values"
  printf 'VITE_API_URL=http://localhost:%s\n' "$BACKEND_PORT" >"$FRONTEND_DIR/.env"
fi

# ------------------------------------------------------------------ dependencies

# node_modules contains platform-specific code (native SQLite/bcrypt modules,
# Vite's bundler binaries, .bin launchers). If it was installed on another
# OS/CPU/Node version (e.g. the folder was copied from Windows), reinstall it.
PLATFORM_ID="$(node -p 'process.platform + "-" + process.arch + "-node-abi" + process.versions.modules')"
STAMP_FILE="node_modules/.notes-platform"

install_deps() {
  local dir="$1" name="$2"
  if [ -d "$dir/node_modules" ] &&
    [ "$(cat "$dir/$STAMP_FILE" 2>/dev/null)" != "$PLATFORM_ID" ]; then
    info "Reinstalling $name dependencies (node_modules was installed on a different platform)"
    rm -rf "$dir/node_modules"
  else
    info "Installing $name dependencies"
  fi
  (cd "$dir" && npm install --no-audit --no-fund --loglevel=error)
  printf '%s\n' "$PLATFORM_ID" >"$dir/$STAMP_FILE"
}

if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  install_deps "$BACKEND_DIR" backend
  install_deps "$FRONTEND_DIR" frontend
fi

info "Building backend"
# Run the Nest CLI through node so no executable bit is needed in node_modules.
(cd "$BACKEND_DIR" && node node_modules/@nestjs/cli/bin/nest.js build)

# ----------------------------------------------------------------------- helpers

port_is_free() {
  node -e '
    const server = require("net").createServer();
    server.once("error", () => process.exit(1));
    server.once("listening", () => server.close(() => process.exit(0)));
    server.listen(Number(process.argv[1]));
  ' "$1"
}

url_responds() {
  node -e 'fetch(process.argv[1]).then(() => process.exit(0), () => process.exit(1))' "$1"
}

is_running() {
  [ -n "$1" ] && kill -0 "$1" 2>/dev/null
}

cleanup() {
  trap - INT TERM EXIT
  if is_running "$FRONTEND_PID" || is_running "$BACKEND_PID"; then
    echo
    info "Stopping frontend and backend..."
    is_running "$FRONTEND_PID" && kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    is_running "$BACKEND_PID" && kill -TERM "$BACKEND_PID" 2>/dev/null || true
    wait 2>/dev/null || true
    ok "Stopped."
  fi
}
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  port_is_free "$port" ||
    fail "Port $port is already in use. Stop the process using it (or set PORT / FRONTEND_PORT) and try again."
done

# ------------------------------------------------------------------------ start

BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

info "Starting backend on $BACKEND_URL"
(cd "$BACKEND_DIR" && exec node dist/main.js) &
BACKEND_PID=$!

info "Starting frontend on $FRONTEND_URL"
(cd "$FRONTEND_DIR" && exec node node_modules/vite/bin/vite.js --port "$FRONTEND_PORT" --strictPort) &
FRONTEND_PID=$!

# Wait (up to 60s) until both servers answer HTTP requests.
for _ in $(seq 1 120); do
  is_running "$BACKEND_PID" || fail "The backend exited during startup (see the log above)."
  is_running "$FRONTEND_PID" || fail "The frontend exited during startup (see the log above)."
  if url_responds "$BACKEND_URL" && url_responds "$FRONTEND_URL"; then
    break
  fi
  sleep 0.5
done
url_responds "$BACKEND_URL" && url_responds "$FRONTEND_URL" ||
  fail "Timed out waiting for the servers to start."

echo
ok "Notes app is running"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo "   Login:    admin / admin123"
echo "   Press Ctrl+C to stop."
echo

# Keep running until either process exits or the user presses Ctrl+C.
while is_running "$BACKEND_PID" && is_running "$FRONTEND_PID"; do
  sleep 1
done

is_running "$BACKEND_PID" || echo "The backend stopped unexpectedly." >&2
is_running "$FRONTEND_PID" || echo "The frontend stopped unexpectedly." >&2
exit 1
