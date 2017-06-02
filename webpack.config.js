var path = require('path');
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
    filename: '[name]-[chunkhash].js'
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
          use: ['css-loader', 'sass-loader']
        })
      },
      {
        test: /\.css$/,
        use: ExtractTextWebpackPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
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
        loader: 'file-loader'
      },
      {
        test: /\.(woff2?|ttf|eot|svg)$/,
        loader: 'file-loader'
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
      { from: 'data/public', to: 'data' },
      { from: 'data/private', to: 'data' }
    ]),
    new ExtractTextWebpackPlugin('style-[contenthash].css'),
    new FaviconsWebpackPlugin({
      logo: './app/images/noun_888659.png',
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
    new Visualizer()
  ]
};
