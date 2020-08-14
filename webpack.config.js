// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const baseConfig = {
  target: 'node',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'target'),

  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  module: {
    rules: [{ test: /\.(ts|js)x?$/, loader: 'babel-loader', exclude: /node_modules/ }],
  },
}

module.exports = {
  entry: ['whatwg-fetch', path.resolve(__dirname, 'src')],
  target: 'web',

  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'EMSClient',
    libraryTarget: 'umd',
    globalObject: 'this',
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  module: {
    rules: [{ test: /\.(ts|js)x?$/, loader: 'babel-loader', exclude: /node_modules/ }],
  },
};
