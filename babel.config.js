module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: [require.resolve('expo/node_modules/babel-preset-expo')],
  };
};
