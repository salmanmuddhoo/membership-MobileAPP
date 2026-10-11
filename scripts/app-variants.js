// The two apps built from this code (docs/environments.md): one to test
// with, against the test site on Vercel, and one for members, against
// production on Azure. Each is its own app on the phone — its own package
// name, so both install side by side; its own name and icon, so nobody
// mistakes one for the other — and each talks only to its own backend,
// named here (apiUrl) and baked in at build time (EXPO_PUBLIC_API_URL), so
// nobody types an address to build one.
//
// Read by app.config.js and by the APK workflow, so the package a build
// is signed as, the one its Firebase configuration must name and the site
// it talks to are the same by construction.
const VARIANTS = {
  test: {
    name: 'Al Barakah Test',
    package: 'mu.albarakah.member.test',
    apiUrl: 'https://membership-ivory.vercel.app',
    scheme: 'albarakah-test',
    iconBackground: './assets/android-icon-background-test.png',
  },
  production: {
    name: 'Al Barakah',
    package: 'mu.albarakah.member',
    apiUrl: 'https://albarakah-app.com',
    scheme: 'albarakah',
    iconBackground: './assets/android-icon-background.png',
  },
};

// APP_VARIANT names the app; unset is the test app, so nothing built by
// accident ever carries the members' package name.
function variantName(value = process.env.APP_VARIANT) {
  const name = String(value ?? '').trim() || 'test';
  if (!Object.prototype.hasOwnProperty.call(VARIANTS, name)) {
    throw new Error(`APP_VARIANT must be "test" or "production", not "${value}".`);
  }
  return name;
}

function variant(value) {
  return { id: variantName(value), ...VARIANTS[variantName(value)] };
}

module.exports = { VARIANTS, variantName, variant };
