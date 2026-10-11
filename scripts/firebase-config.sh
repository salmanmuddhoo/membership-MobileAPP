#!/usr/bin/env bash
# Writes google-services.json for this app from the secret the workflow
# chose, if it names this app's package (docs/push-notifications.md).
#
#   GOOGLE_SERVICES_JSON   the Firebase configuration, as JSON or base64
#   APP_PACKAGE            the package this build installs as
#
# A Firebase configuration that does not list the package would fail the
# Gradle build ("No matching client found"); it is left out instead, and
# the run's summary says what to add. Sets HAS_FIREBASE in $GITHUB_ENV.
set -euo pipefail

if [ -z "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "HAS_FIREBASE=false" >> "$GITHUB_ENV"
  echo "FIREBASE_NOTE=no Firebase configuration secret is set" >> "$GITHUB_ENV"
  exit 0
fi

tmp="$(mktemp)"
case "$GOOGLE_SERVICES_JSON" in
  \{*) printf '%s' "$GOOGLE_SERVICES_JSON" > "$tmp" ;;
  *) printf '%s' "$GOOGLE_SERVICES_JSON" | base64 -d > "$tmp" ;;
esac

if node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const names = (c.client || []).map(x => x.client_info?.android_client_info?.package_name);
  process.exit(names.includes(process.argv[2]) ? 0 : 3);
' "$tmp" "$APP_PACKAGE"; then
  mv "$tmp" google-services.json
  echo "HAS_FIREBASE=true" >> "$GITHUB_ENV"
else
  status=$?
  rm -f "$tmp"
  [ "$status" -eq 3 ] || { echo "::error::The Firebase configuration secret is not valid JSON."; exit 1; }
  echo "::warning::The Firebase configuration has no Android app for $APP_PACKAGE: this build will not receive push notifications. Add the app in Firebase and update the secret — docs/push-notifications.md."
  echo "HAS_FIREBASE=false" >> "$GITHUB_ENV"
  echo "FIREBASE_NOTE=the Firebase configuration has no Android app for $APP_PACKAGE" >> "$GITHUB_ENV"
fi
