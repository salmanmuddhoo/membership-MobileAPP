// Extends app.json with what only a build knows: which of the two apps this
// is, the Android versionCode, and whether it can receive push
// notifications.
//
// Which app: APP_VARIANT, "test" (the default) or "production"
// (scripts/app-variants.js, docs/environments.md). It sets the name under
// the icon, the package Android installs it as, its link scheme and its
// icon's background; the backend it talks to comes with the build
// (EXPO_PUBLIC_API_URL), and the screens read the variant from
// expoConfig.extra.appVariant.
//
// Google Play refuses an upload whose versionCode is not higher than the
// last one, so CI passes its run number as ANDROID_VERSION_CODE and every
// build from GitHub is a later version than the one before. A local build
// without it is version 1, which is fine for a phone that has never had
// the app and wrong for one that has.
//
// Push notifications need the Firebase project's google-services.json
// (docs/push-notifications.md), naming this app's package. It is not
// committed — CI writes it from a secret — so it is wired in only when it
// is there, and a build without it still builds and still runs, just
// without notifications.
const fs = require('node:fs');
const path = require('node:path');
const { variant } = require('./scripts/app-variants');

const GOOGLE_SERVICES = path.join(__dirname, 'google-services.json');

module.exports = ({ config }) => {
  const app = variant();
  const versionCode = Number(process.env.ANDROID_VERSION_CODE ?? '1');
  const android = {
    ...config.android,
    package: app.package,
    adaptiveIcon: { ...config.android.adaptiveIcon, backgroundImage: app.iconBackground },
    versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : 1,
  };
  if (fs.existsSync(GOOGLE_SERVICES)) android.googleServicesFile = './google-services.json';
  return {
    ...config,
    name: app.name,
    scheme: app.scheme,
    ios: { ...config.ios, bundleIdentifier: app.package },
    android,
    extra: { ...config.extra, appVariant: app.id },
  };
};
