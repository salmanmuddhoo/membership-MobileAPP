#!/usr/bin/env python3
"""Point the generated Android project's release build at our signing key.

`expo prebuild` writes android/app/build.gradle from Expo's template, whose
release build type signs with the debug key. This rewrites it to use a
`release` signing config read from gradle.properties (ALBARAKAH_* values
written by scripts/android-signing.sh). Run after prebuild, before Gradle.
"""
import re
import sys

PATH = "android/app/build.gradle"

with open(PATH) as f:
    source = f.read()

# 1. Add a release signing config beside the template's debug one.
signing = re.search(r"^(\s*)signingConfigs\s*\{\n", source, re.M)
if not signing:
    sys.exit("android-signing: no signingConfigs block in " + PATH)
indent = signing.group(1)
inner = indent + "    "
release_config = (
    f"{inner}release {{\n"
    f"{inner}    storeFile file(ALBARAKAH_STORE_FILE)\n"
    f"{inner}    storePassword ALBARAKAH_STORE_PASSWORD\n"
    f"{inner}    keyAlias ALBARAKAH_KEY_ALIAS\n"
    f"{inner}    keyPassword ALBARAKAH_KEY_PASSWORD\n"
    f"{inner}}}\n"
)
source = source[: signing.end()] + release_config + source[signing.end() :]

# 2. Make the release build type use it. The template's release block says
#    `signingConfig signingConfigs.debug`; only that occurrence inside
#    buildTypes.release changes.
build_types = re.search(r"buildTypes\s*\{", source)
if not build_types:
    sys.exit("android-signing: no buildTypes block in " + PATH)
release = re.search(r"release\s*\{", source[build_types.end() :])
if not release:
    sys.exit("android-signing: no release build type in " + PATH)
start = build_types.end() + release.end()
head, tail = source[:start], source[start:]
patched, count = re.subn(
    r"signingConfig\s+signingConfigs\.debug", "signingConfig signingConfigs.release", tail, count=1
)
if count != 1:
    sys.exit("android-signing: release build type does not sign with the debug key as expected")
source = head + patched

with open(PATH, "w") as f:
    f.write(source)
print("android-signing: release build now signs with signingConfigs.release")
