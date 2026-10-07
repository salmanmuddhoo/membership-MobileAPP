// Extends app.json with what only a build knows: the Android versionCode,
// and whether this build can receive push notifications.
//
// Google Play refuses an upload whose versionCode is not higher than the
// last one, so CI passes its run number as ANDROID_VERSION_CODE and every
// build from GitHub is a later version than the one before. A local build
// without it is version 1, which is fine for a phone that has never had
// the app and wrong for one that has.
//
// Push notifications need the Firebase project's google-services.json
// (docs/push-notifications.md). It is not committed — CI writes it from a
// secret — so it is wired in only when it is there, and a build without it
// still builds and still runs, just without notifications.
const fs = require('node:fs');
const path = require('node:path');

const GOOGLE_SERVICES = path.join(__dirname, 'google-services.json');

module.exports = ({ config }) => {
  const versionCode = Number(process.env.ANDROID_VERSION_CODE ?? '1');
  const android = {
    ...config.android,
    versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : 1,
  };
  if (fs.existsSync(GOOGLE_SERVICES)) android.googleServicesFile = './google-services.json';
  return { ...config, android };
};
