#!/usr/bin/env bash
#
# End-to-end test: starts the app with ./start.sh, exercises the REST API with
# curl, restarts everything and checks that the data was persisted.
#
# Uses a separate PostgreSQL container and volume (Docker Compose project
# "notes-test" on port 55432), so your real notes are never touched. The test
# container and its data are removed when the tests finish.
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Isolated test database (read by start.sh, docker compose and the backend).
export COMPOSE_PROJECT_NAME="notes-test"
export DB_PORT="${TEST_DB_PORT:-55432}"
export DB_NAME="notes_test"
export DB_USER="notes"
export DB_PASSWORD="notes"
BACKEND_PORT="${PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
API="http://localhost:$BACKEND_PORT"
WEB="http://localhost:$FRONTEND_PORT"
START_TIMEOUT=300

LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/notes-test.XXXXXX")"
START_PID=""
PASSED=0
FAILED=0

# ----------------------------------------------------------------------- output

pass() {
  PASSED=$((PASSED + 1))
  printf '  \033[32m✔\033[0m %s\n' "$1"
}
failure() {
  FAILED=$((FAILED + 1))
  printf '  \033[31m✖ %s\033[0m\n' "$1"
  [ -n "${2:-}" ] && printf '      %s\n' "$2"
}
section() { printf '\n\033[1m%s\033[0m\n' "$*"; }
abort() {
  printf '\n\033[31m%s\033[0m\n' "$*" >&2
  exit 1
}

# ------------------------------------------------------------------ app control

start_app() {
  : >"$LOG_FILE"
  ./start.sh >>"$LOG_FILE" 2>&1 &
  START_PID=$!
  local waited=0
  until grep -q "Notes app is running" "$LOG_FILE"; do
    if ! kill -0 "$START_PID" 2>/dev/null; then
      echo "----- start.sh output -----"
      cat "$LOG_FILE"
      abort "start.sh exited before the app was ready."
    fi
    if [ "$waited" -ge "$START_TIMEOUT" ]; then
      cat "$LOG_FILE"
      abort "Timed out after ${START_TIMEOUT}s waiting for start.sh."
    fi
    sleep 1
    waited=$((waited + 1))
  done
}

stop_app() {
  if [ -n "$START_PID" ] && kill -0 "$START_PID" 2>/dev/null; then
    # SIGTERM triggers the same clean shutdown as Ctrl+C.
    kill -TERM "$START_PID" 2>/dev/null
    wait "$START_PID" 2>/dev/null
  fi
  START_PID=""
}

compose() {
  (cd "$ROOT_DIR/backend" && docker compose "$@")
}

cleanup() {
  stop_app
  # Remove the test container and its volume.
  compose down -v --remove-orphans >/dev/null 2>&1
  rm -f "$LOG_FILE"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# ------------------------------------------------------------------ HTTP helpers

TOKEN=""
STATUS=""
BODY=""

# api METHOD PATH [JSON_BODY] -> sets STATUS and BODY
api() {
  local args=(-s -o "$LOG_FILE.body" -w '%{http_code}' -X "$1" "$API$2")
  [ -n "$TOKEN" ] && args+=(-H "Authorization: Bearer $TOKEN")
  [ $# -ge 3 ] && args+=(-H 'Content-Type: application/json' -d "$3")
  STATUS="$(curl "${args[@]}")"
  BODY="$(cat "$LOG_FILE.body" 2>/dev/null)"
  rm -f "$LOG_FILE.body"
}

# json EXPRESSION -> evaluates a JS expression against the last BODY (as `d`)
json() {
  node -e 'const d = JSON.parse(process.argv[1]); const v = eval(process.argv[2]); console.log(typeof v === "object" ? JSON.stringify(v) : v);' \
    "$BODY" "$1" 2>/dev/null
}

# expect DESCRIPTION EXPECTED_STATUS [JS_CONDITION]
expect() {
  if [ "$STATUS" != "$2" ]; then
    failure "$1" "expected HTTP $2, got $STATUS: $BODY"
    return
  fi
  if [ -n "${3:-}" ] && [ "$(json "$3")" != "true" ]; then
    failure "$1" "condition failed: $3 — body: $BODY"
    return
  fi
  pass "$1"
}

login() {
  TOKEN=""
  api POST /auth/login '{"username":"admin","password":"admin123"}'
  expect "login as admin returns a JWT" 200 'typeof d.accessToken === "string" && d.user.username === "admin"'
  TOKEN="$(json 'd.accessToken')"
}

# ----------------------------------------------------------------------- checks

command -v curl >/dev/null 2>&1 || abort "curl is required to run the tests."
command -v node >/dev/null 2>&1 || abort "Node.js is required to run the tests."
command -v docker >/dev/null 2>&1 || abort "Docker is required to run the tests."
# Start from an empty test database.
compose down -v --remove-orphans >/dev/null 2>&1

section "1. Startup"
start_app
pass "./start.sh started PostgreSQL, backend and frontend"
if grep -Eq 'ERROR|Error:' "$LOG_FILE"; then
  failure "startup log has no errors" "$(grep -E 'ERROR|Error:' "$LOG_FILE" | head -5)"
else
  pass "startup log has no errors"
fi
FLYWAY_INFO="$(compose run --rm flyway info 2>/dev/null)"
echo "$FLYWAY_INFO" | grep -Eq '\| *Versioned *\| *1 *\| *baseline .*\| *Success *\|' &&
  pass "Flyway applied V1__baseline (state: Success)" ||
  failure "Flyway applied V1__baseline (state: Success)" "$FLYWAY_INFO"
TABLES="$(compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -Atc \
  "select string_agg(tablename, ',' order by tablename) from pg_tables where schemaname = 'public'")"
[ "$TABLES" = "categories,flyway_schema_history,note_categories,notes,users" ] &&
  pass "schema has the app tables plus flyway_schema_history" ||
  failure "schema has the app tables plus flyway_schema_history" "got: $TABLES"
grep -q "Entities match the database schema" "$LOG_FILE" &&
  pass "TypeORM entities match the Flyway schema" ||
  failure "TypeORM entities match the Flyway schema"
WEB_BODY="$(curl -s "$WEB")"
echo "$WEB_BODY" | grep -q '<div id="root">' && pass "frontend serves the React app at $WEB" ||
  failure "frontend serves the React app at $WEB"

section "2. Authentication"
api GET /notes
expect "GET /notes without a token is rejected" 401
TOKEN="not-a-valid-token"
api GET /categories
expect "GET /categories with an invalid token is rejected" 401
TOKEN=""
api POST /auth/login '{"username":"admin","password":"wrong"}'
expect "login with a wrong password is rejected" 401
api POST /auth/login '{"username":"admin"}'
expect "login without a password fails validation" 400
login

section "3. Categories"
api POST /categories '{"name":"Work"}'
expect "create category Work" 201 'd.name === "Work"'
WORK_ID="$(json 'd.id')"
api POST /categories '{"name":"Personal"}'
expect "create category Personal" 201 'd.name === "Personal"'
PERSONAL_ID="$(json 'd.id')"
api POST /categories '{"name":"Work"}'
expect "duplicate category name is rejected" 409
api POST /categories '{"name":""}'
expect "empty category name fails validation" 400
api GET /categories
expect "list categories" 200 'd.length === 2'

section "4. Notes"
api POST /notes "{\"title\":\"Meeting\",\"content\":\"Discuss roadmap\",\"categoryIds\":[$WORK_ID]}"
expect "create note with a category" 201 'd.title === "Meeting" && d.archived === false && d.categories.length === 1'
NOTE1="$(json 'd.id')"
api POST /notes '{"title":"Groceries","content":"Milk, eggs"}'
expect "create note without categories" 201 'd.categories.length === 0'
NOTE2="$(json 'd.id')"
api POST /notes '{"title":"","content":"x"}'
expect "note without a title fails validation" 400
api POST /notes '{"title":"x","unknown":true}'
expect "unknown fields are rejected" 400
api GET /notes
expect "list active notes" 200 'd.length === 2'
api PATCH "/notes/$NOTE2" '{"title":"Groceries (updated)","content":"Milk, eggs, bread"}'
expect "edit a note" 200 'd.title === "Groceries (updated)" && d.content === "Milk, eggs, bread"'
api PATCH /notes/99999 '{"title":"nope"}'
expect "editing a missing note returns 404" 404
api GET /notes/99999999999
expect "an id beyond the Postgres integer range is rejected" 400
api GET "/notes?categoryId=99999999999"
expect "a categoryId beyond the Postgres integer range is rejected" 400
api GET "/notes/$NOTE1"
expect "JSON types are unchanged for the frontend (number id, boolean, ISO dates)" 200 \
  'typeof d.id === "number" && typeof d.archived === "boolean" && typeof d.categories[0].id === "number" && !isNaN(Date.parse(d.updatedAt)) && d.updatedAt.endsWith("Z")'

section "5. Note ↔ category"
api POST "/notes/$NOTE2/categories/$PERSONAL_ID"
expect "add category to a note" 201 "d.categories.some((c) => c.id === $PERSONAL_ID)"
api POST "/notes/$NOTE2/categories/$WORK_ID"
expect "add a second category to the same note" 201 'd.categories.length === 2'
api DELETE "/notes/$NOTE2/categories/$WORK_ID"
expect "remove category from a note" 200 "d.categories.length === 1 && d.categories[0].id === $PERSONAL_ID"
api POST "/notes/$NOTE2/categories/99999"
expect "adding a missing category returns 404" 404

section "6. Filtering"
api GET "/notes?categoryId=$WORK_ID"
expect "filter by Work returns only the Work note" 200 "d.length === 1 && d[0].id === $NOTE1"
api GET "/notes?categoryId=$PERSONAL_ID"
expect "filter by Personal returns only the Personal note" 200 "d.length === 1 && d[0].id === $NOTE2"
api GET "/notes?archived=maybe"
expect "invalid archived flag fails validation" 400

section "7. Archiving"
api PATCH "/notes/$NOTE1/archive"
expect "archive a note" 200 'd.archived === true'
api GET "/notes?archived=false"
expect "archived note leaves the active list" 200 "!d.some((n) => n.id === $NOTE1)"
api GET "/notes?archived=true"
expect "archived note appears in the archived list" 200 "d.length === 1 && d[0].id === $NOTE1"
api GET "/notes?archived=true&categoryId=$WORK_ID"
expect "filter works on archived notes" 200 "d.length === 1 && d[0].id === $NOTE1"
api PATCH "/notes/$NOTE1/unarchive"
expect "unarchive a note" 200 'd.archived === false'
api GET /notes
expect "unarchived note is back in the active list" 200 "d.some((n) => n.id === $NOTE1)"

section "8. Deleting"
api POST /notes '{"title":"Temporary"}'
TEMP_NOTE="$(json 'd.id')"
api DELETE "/notes/$TEMP_NOTE"
expect "delete a note" 204
api GET "/notes/$TEMP_NOTE"
expect "deleted note is gone" 404
api POST /categories '{"name":"Temporary"}'
TEMP_CAT="$(json 'd.id')"
api POST "/notes/$NOTE1/categories/$TEMP_CAT"
api DELETE "/categories/$TEMP_CAT"
expect "delete a category" 204
api GET "/notes/$NOTE1"
expect "deleted category is removed from its notes" 200 "!d.categories.some((c) => c.id === $TEMP_CAT)"

# State to verify after restart: NOTE1 active (Work), NOTE2 archived (Personal).
api PATCH "/notes/$NOTE2/archive"
expect "archive a note before restarting" 200 'd.archived === true'

section "9. Persistence after restart"
stop_app
if curl -s -o /dev/null "$API" || curl -s -o /dev/null "$WEB"; then
  failure "both servers stop cleanly"
else
  pass "both servers stop cleanly"
fi
if [ -z "$(compose ps -q --status running postgres 2>/dev/null)" ]; then
  pass "PostgreSQL container stopped"
else
  failure "PostgreSQL container stopped"
fi
start_app
pass "app restarted"
login
api GET /notes
expect "active note survived the restart" 200 \
  "d.length === 1 && d[0].id === $NOTE1 && d[0].title === 'Meeting' && d[0].categories[0].name === 'Work'"
api GET "/notes?archived=true"
expect "archived note survived the restart" 200 \
  "d.length === 1 && d[0].id === $NOTE2 && d[0].title === 'Groceries (updated)' && d[0].categories[0].name === 'Personal'"
api GET /categories
expect "categories survived the restart" 200 'd.map((c) => c.name).join() === "Personal,Work"'

# ---------------------------------------------------------------------- summary

printf '\n\033[1mResult:\033[0m %d passed, %d failed\n' "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ] || exit 1
