//
// Config compiles scripts so they can use ES6 & TypeScript without worrying
// about Node.js version or CLI scripts like babel-node/ts-node scripts.
//
const R = require('ramda')
const fs = require('fs-extra')
const path = require('path')
const webpack = require('webpack')
const nodeExternals = require('webpack-node-externals')
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin')

const scriptsPath = path.resolve(__dirname, 'scripts')

const babelOptions = {
  presets: [
    ["env", {
      "targets": {
        "node": 6
      },
      "modules": false,
      "debug": false
    }]
  ]
}

module.exports = {
  target: 'node',
  entry: () =>
    fs.readdir(scriptsPath)
      .then(R.filter(R.test(/\.[jt]s$/)))
      .then(R.map(v => [
        path.basename(v, path.extname(v)),
        path.resolve(scriptsPath, v)
      ]))
      .then(R.fromPairs),
  output: {
    path: path.resolve(__dirname, 'tmp'),
    publicPath: '',
    filename: '[name].js'
  },
  node: {
    __dirname: true
  },
  stats: {
    assets: false,
    hash: false,
    entrypoints: false,
    errors: true,
    errorDetails: true,
    maxModules: 0,
    modules: false,
    version: false
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: babelOptions
          },
          {
            loader: 'ts-loader',
            options: {
              logLevel: 'warn'
            }
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: babelOptions
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  devtool: 'inline-source-map',
  externals: [
    nodeExternals()
  ],
  plugins: [
    new HardSourceWebpackPlugin()
  ]
};
