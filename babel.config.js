module.exports = {
  env: {
    web: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
          },
        ],
      ],
    },
    node: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              // Match engines.node so the published build runs on the oldest supported Node.js
              node: '24',
            },
            modules: 'commonjs',
          },
        ],
      ],
    },
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
            modules: 'commonjs',
          },
        ],
      ],
    },
  },
  presets: ['@babel/preset-typescript'],
};
