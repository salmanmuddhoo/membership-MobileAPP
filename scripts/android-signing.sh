#!/usr/bin/env bash
# Prepare the release signing key for a CI build of the Android APK.
#
# With ANDROID_KEYSTORE_BASE64 (and the three passwords) in the environment,
# every build is signed with the same key, so a newer APK installs over an
# older one as an update. Without them a throwaway key is generated for this
# run: the APK still installs, but the next build will not update it in
# place — uninstall first. See docs/install-android.md.
set -euo pipefail

if [ -n "${KEYSTORE_BASE64:-}" ]; then
  echo "$KEYSTORE_BASE64" | base64 -d > android/app/release.keystore
  : "${KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD is required with a keystore}"
  : "${KEY_ALIAS:?ANDROID_KEY_ALIAS is required with a keystore}"
  : "${KEY_PASSWORD:?ANDROID_KEY_PASSWORD is required with a keystore}"
  echo "Using the repository's signing key."
else
  KEYSTORE_PASSWORD=throwaway
  KEY_ALIAS=throwaway
  KEY_PASSWORD=throwaway
  keytool -genkeypair -v -keystore android/app/release.keystore \
    -alias throwaway -keyalg RSA -keysize 2048 -validity 3650 \
    -storepass throwaway -keypass throwaway \
    -dname "CN=Al Barakah preview, O=Al Barakah MCSL, C=MU"
  echo "::warning::No ANDROID_KEYSTORE_BASE64 secret: signed with a throwaway key. Uninstall the previous build before installing this one."
fi

# The template's gradle.properties does not end with a newline; start on a
# fresh line so the first property is not glued to the last existing one.
{
  echo
  echo "ALBARAKAH_STORE_FILE=release.keystore"
  echo "ALBARAKAH_STORE_PASSWORD=$KEYSTORE_PASSWORD"
  echo "ALBARAKAH_KEY_ALIAS=$KEY_ALIAS"
  echo "ALBARAKAH_KEY_PASSWORD=$KEY_PASSWORD"
} >> android/gradle.properties

python3 scripts/android-signing.py
