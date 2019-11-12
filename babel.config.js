module.exports = {
  env: {
    web: {
      presets: [
        [
          '@babel/preset-env',
          {
            useBuiltIns: 'entry',
            modules: false,
            corejs: 3,
          },
        ],
      ]
    },
    node: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ]
    },
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            }
          }
        ]
      ]
    }
  },

  plugins: [
    '@babel/plugin-proposal-class-properties'
  ]
};
