#!/usr/bin/env bash
# Which backend this APK talks to, and in which mode (docs/environments.md).
#
#   APP     test | production | demo   (the workflow's choice)
#   OVERRIDE                          an origin typed for this run (test only)
#   TEST_URL, PRODUCTION_URL          the repository variables TEST_API_URL
#                                     and PRODUCTION_API_URL
#
# Writes EXPO_PUBLIC_API_MODE and EXPO_PUBLIC_API_URL to $GITHUB_ENV. The
# members' app never falls back to a default and never takes a typed
# override: a production build pointed at the wrong site would put members'
# money requests in front of the wrong office, so it builds only from the
# repository variable, and never against the test site.
set -euo pipefail

DEFAULT_TEST_URL='https://membership-ivory.vercel.app'

strip() { local v="${1%/}"; printf '%s' "${v// /}"; }

case "${APP:?}" in
  demo)
    mode=mock
    url=''
    ;;
  test)
    mode=live
    url="$(strip "${OVERRIDE:-${TEST_URL:-$DEFAULT_TEST_URL}}")"
    [ -n "$url" ] || url="$DEFAULT_TEST_URL"
    ;;
  production)
    mode=live
    url="$(strip "${PRODUCTION_URL:-}")"
    if [ -z "$url" ]; then
      echo "::error::The members' app needs the production site's address. Set the PRODUCTION_API_URL repository variable (Settings → Secrets and variables → Actions → Variables) to the Azure site's https:// address — docs/environments.md."
      exit 1
    fi
    if [ -n "${OVERRIDE:-}" ] && [ "$(strip "$OVERRIDE")" != "$url" ]; then
      echo "::error::A typed backend address is for the test app only. The members' app is built against PRODUCTION_API_URL ($url) alone."
      exit 1
    fi
    test_url="$(strip "${TEST_URL:-$DEFAULT_TEST_URL}")"
    if [ "$url" = "$test_url" ]; then
      echo "::error::PRODUCTION_API_URL is the test site ($url). The members' app must talk to production on Azure."
      exit 1
    fi
    ;;
  *)
    echo "::error::Unknown app \"$APP\": choose test, production or demo."
    exit 1
    ;;
esac

if [ "$mode" = live ] && [[ ! "$url" =~ ^https://[^/[:space:]]+$ ]]; then
  echo "::error::The backend address must be an https:// origin with no path, not \"$url\"."
  exit 1
fi

{
  echo "EXPO_PUBLIC_API_MODE=$mode"
  echo "EXPO_PUBLIC_API_URL=$url"
} >> "$GITHUB_ENV"
echo "App: $APP · mode: $mode · backend: ${url:-none (demo data)}"
