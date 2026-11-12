module.exports = function commerceWebpackConfig(options) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
  };
};
