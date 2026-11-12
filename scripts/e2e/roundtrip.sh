#!/usr/bin/env bash
# =============================================================================
# roundtrip.sh: the W2-11 browser test against a REAL local Supabase.
#
# Every other browser test fakes our API. This one runs the whole demo flow on
# a real database, real Auth and real Realtime, in two browsers at once:
# grandma's paired phone and the family member's laptop.
#
#   1. starts a slim local Supabase in Docker (database, Auth, REST, Realtime;
#      no dashboard, storage or e-mail) and applies our migrations
#   2. reads its local URL and keys (`supabase status -o env`; these are the
#      public demo keys every local Supabase uses, not our real keys)
#   3. runs tests/roundtrip/ with playwright.roundtrip.config.ts, which builds
#      and starts the app against that database
#
# Usage:   npm run e2e:roundtrip          (needs Docker)
# Stop:    npx supabase@3.1.0 stop
# =============================================================================
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."
SUPABASE="npx --yes supabase@3.1.0"

# Only what the round trip needs; the other services take minutes to download.
$SUPABASE start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,storage-api,postgres-meta,mailpit

# `status -o env` prints lines like API_URL="http://127.0.0.1:54321".
eval "$($SUPABASE status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
# Fresh random peppers for this throwaway database (like `openssl rand -hex 32`).
PAIRING_PEPPER="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
HASH_PEPPER="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
export PAIRING_PEPPER HASH_PEPPER
export EMAIL_PROVIDER=noop
export SITE_URL="http://localhost:3100"

npx playwright test -c playwright.roundtrip.config.ts --trace retain-on-failure "$@"
