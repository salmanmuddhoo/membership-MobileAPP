module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must stay last: Reanimated rewrites worklets after every other plugin.
    plugins: ['react-native-worklets/plugin'],
  };
};
