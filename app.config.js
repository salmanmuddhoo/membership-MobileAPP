// Extends app.json with what only a build knows: the Android versionCode.
// Google Play refuses an upload whose versionCode is not higher than the
// last one, so CI passes its run number as ANDROID_VERSION_CODE and every
// build from GitHub is a later version than the one before. A local build
// without it is version 1, which is fine for a phone that has never had
// the app and wrong for one that has.
module.exports = ({ config }) => {
  const versionCode = Number(process.env.ANDROID_VERSION_CODE ?? '1');
  return {
    ...config,
    android: {
      ...config.android,
      versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : 1,
    },
  };
};
