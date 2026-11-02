#!/usr/bin/env bash
# =============================================================================
# test-local.sh: run our database migrations and pgTAP tests on a throwaway
# local PostgreSQL, WITHOUT Docker.
#
# Normally we use `supabase start` + `supabase test db`. This script is the
# fallback when Docker is not available. It:
#   1. creates a temporary PostgreSQL cluster in a temp folder
#   2. starts it (unix socket only, no TCP port, so it never clashes)
#   3. creates a database and runs scripts/db/supabase-shim.sql
#      (fake roles, auth schema, auth.uid() ... see that file)
#   4. applies every supabase/migrations/*.sql in order
#   5. runs every supabase/tests/*.test.sql (pg_prove if installed, else psql)
#   6. prints a summary, then stops the server and deletes the folder
#
# Usage:   scripts/db/test-local.sh
# Needs:   PostgreSQL server binaries (initdb, pg_ctl) + psql + pgTAP.
#          Set PG_BIN=/path/to/postgresql/bin to choose a version.
# Root:    PostgreSQL refuses to run as root, so as root the server runs as
#          the 'postgres' OS user (runuser). psql itself can run as anyone.
# =============================================================================
set -euo pipefail

# --- Paths -------------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SHIM_FILE="$ROOT_DIR/scripts/db/supabase-shim.sql"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
TESTS_DIR="$ROOT_DIR/supabase/tests"

# Newest installed PostgreSQL, unless PG_BIN is given.
if [[ -z "${PG_BIN:-}" ]]; then
  PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n 1 || true)"
fi
if [[ -z "$PG_BIN" || ! -x "$PG_BIN/initdb" ]]; then
  echo "error: PostgreSQL server binaries not found (set PG_BIN)" >&2
  exit 1
fi

DB_NAME="scamly_test"
DB_USER="postgres"
PORT="54329"   # only names the socket file; no TCP port is opened

# --- Run server binaries as a non-root user ------------------------------------
if [[ "$(id -u)" -eq 0 ]]; then
  RUN_AS=(runuser -u postgres --)
else
  RUN_AS=()
fi

# --- Temporary cluster folder, removed on exit ---------------------------------
WORK_DIR="$(mktemp -d "${SCAMLY_TEST_TMP:-/tmp}/scamly-db-test.XXXXXX")"
DATA_DIR="$WORK_DIR/data"
SOCKET_DIR="$WORK_DIR/socket"
LOG_FILE="$WORK_DIR/postgres.log"
mkdir -p "$SOCKET_DIR"
chmod 755 "$WORK_DIR"
if [[ "$(id -u)" -eq 0 ]]; then
  chown -R postgres: "$WORK_DIR"
fi

cleanup() {
  local status=$?
  if [[ -f "$DATA_DIR/postmaster.pid" ]]; then
    "${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m fast -w stop >/dev/null 2>&1 || true
  fi
  if [[ $status -ne 0 && -f "$LOG_FILE" ]]; then
    echo "--- last lines of the PostgreSQL log ---" >&2
    tail -n 20 "$LOG_FILE" >&2 || true
  fi
  rm -rf "$WORK_DIR"
  exit $status
}
trap cleanup EXIT

# --- 1 + 2: create and start the cluster ---------------------------------------
echo "==> Creating temporary PostgreSQL cluster ($("$PG_BIN/postgres" --version))"
"${RUN_AS[@]}" "$PG_BIN/initdb" -D "$DATA_DIR" -U "$DB_USER" --auth=trust \
  --encoding=UTF8 --locale=C.UTF-8 >/dev/null

"${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$DATA_DIR" -l "$LOG_FILE" -w \
  -o "-c listen_addresses='' -c wal_level=logical -k $SOCKET_DIR -p $PORT" start >/dev/null

PSQL=(psql -X -h "$SOCKET_DIR" -p "$PORT" -U "$DB_USER" -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -d postgres -c "create database $DB_NAME"

# --- 3 + 4: shim, then migrations in order --------------------------------------
echo "==> Applying Supabase shim"
"${PSQL[@]}" -d "$DB_NAME" -f "$SHIM_FILE"

echo "==> Applying migrations"
shopt -s nullglob
migrations=("$MIGRATIONS_DIR"/*.sql)   # bash sorts the names, so timestamps run in order
for file in "${migrations[@]}"; do
  echo "    $(basename "$file")"
  "${PSQL[@]}" -d "$DB_NAME" -f "$file"
done

# --- 5: tests -------------------------------------------------------------------
tests=("$TESTS_DIR"/*.test.sql)
if [[ ${#tests[@]} -eq 0 ]]; then
  echo "error: no test files in $TESTS_DIR" >&2
  exit 1
fi

echo "==> Running ${#tests[@]} pgTAP test files"

if command -v pg_prove >/dev/null 2>&1 && [[ -z "${NO_PG_PROVE:-}" ]]; then
  # pg_prove is the standard pgTAP runner (also used by `supabase test db`).
  # It checks the plan, counts ok / not ok and prints the summary itself.
  pg_prove -h "$SOCKET_DIR" -p "$PORT" -U "$DB_USER" -d "$DB_NAME" "${tests[@]}"
  echo "==> All database tests passed"
  exit 0
fi

# Fallback without pg_prove: run each file with psql and read the TAP output.
total_pass=0
total_fail=0
failed_files=0
for file in "${tests[@]}"; do
  name="$(basename "$file")"
  # Same psql options pg_prove uses: no headers, tuples only, quiet.
  if ! output="$("${PSQL[@]}" -d "$DB_NAME" --no-align --tuples-only --pset pager=off -f "$file" 2>&1)"; then
    echo "$output"
    echo "    FAIL  $name (psql error)"
    failed_files=$((failed_files + 1))
    continue
  fi
  pass=$(grep -c '^ok ' <<<"$output" || true)
  fail=$(grep -c '^not ok ' <<<"$output" || true)
  planned=$(sed -n 's/^1\.\.\([0-9]*\)$/\1/p' <<<"$output" | head -n 1)
  total_pass=$((total_pass + pass))
  total_fail=$((total_fail + fail))
  if [[ $fail -gt 0 || -z "$planned" || $planned -ne $((pass + fail)) ]]; then
    echo "$output" | grep -E '^(not ok|#)' || true
    echo "    FAIL  $name (passed $pass, failed $fail, planned ${planned:-?})"
    failed_files=$((failed_files + 1))
  else
    echo "    ok    $name ($pass assertions)"
  fi
done

echo
echo "==> Summary: files=${#tests[@]}, assertions passed=$total_pass, failed=$total_fail, failing files=$failed_files"
if [[ $failed_files -gt 0 ]]; then
  exit 1
fi
echo "==> All database tests passed"
