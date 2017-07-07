var path = require('path');
var webpack = require('webpack');
var CleanObsoleteChunks = require('webpack-clean-obsolete-chunks');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var ExtractTextWebpackPlugin = require('extract-text-webpack-plugin');
var FaviconsWebpackPlugin = require('favicons-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var Visualizer = require('webpack-visualizer-plugin');

module.exports = {
  target: 'web',
  entry: {
    app: './app/scripts/app.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '',
    filename: 'assets/[name]-[chunkhash].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: [
            ["env", {
              "targets": {
                "browsers": ["last 2 versions", "safari >= 7"]
              },
              "modules": false,
              "debug": true
            }]
          ]
        }
      },
      {
        test: /\.scss$/,
        use: ExtractTextWebpackPlugin.extract({
          fallback: 'style-loader',
          //resolve-url-loader may be chained before sass-loader if necessary
          use: ['css-loader', 'sass-loader'],
          // Somewhat terrible hack to allow CSS to go in assets/
          publicPath: '../'
        })
      },
      {
        test: /\.css$/,
        use: ExtractTextWebpackPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader',
          // Somewhat terrible hack to allow CSS to go in assets/
          publicPath: '../'
        })
      },
      {
        test: /\.html$/,
        use: [
          //'htmllint-loader',
          'html-loader'
        ]
      },
      {
        test: /\.(png|gif)$/,
        loader: 'file-loader?name=./assets/[name]-[sha512:hash:base32:16].[ext]'
      },
      {
        test: /\.(woff2?|ttf|eot|svg)$/,
        loader: 'file-loader?name=./assets/[name]-[sha512:hash:base32:16].[ext]'
      }
    ]
  },
  devtool: 'source-map',
  devServer: {
    compress: true, // enable gzip compression
    proxy: { // proxy URLs to backend development server
      '/phantomjs/': {
        target: 'http://127.0.0.1:9002',
        changeOrigin: true,
        pathRewrite: {
          '^/phantomjs/': '/'
        }
      },
      '/stats/': {
        target: 'http://127.0.0.1:9004',
        changeOrigin: true,
        pathRewrite: {
          '^/stats/': '/'
        }
      }
    },
    port: 9000
  },
  plugins: [
    new CleanObsoleteChunks(),
    new CopyWebpackPlugin([
      { from: 'correspondences', to: 'correspondences' },
      { from: 'data', to: 'data' }
    ]),
    new ExtractTextWebpackPlugin({
      filename: 'assets/style-[contenthash].css'
    }),
    new FaviconsWebpackPlugin({
      logo: './app/images/noun_888659.png',
      prefix: 'assets/icons-[hash]/',
      inject: true,
      icons: {
        android: false,
        appleIcon: false,
        appleStartup: false,
        coast: false,
        favicons: true,
        firefox: false,
        opengraph: false,
        twitter: false,
        yandex: false,
        windows: false
      }
    }),
    new HtmlWebpackPlugin({
      template: 'app/index.ejs',
      filename: 'index.html'
    }),
    new Visualizer({
      filename: 'webpack-stats.html'
    })
  ]
};
