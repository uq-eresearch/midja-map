var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var ExtractTextWebpackPlugin = require('extract-text-webpack-plugin');
var FaviconsWebpackPlugin = require('favicons-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  target: 'web',
  entry: {
    app: './app/scripts/app.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '',
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: ExtractTextWebpackPlugin.extract({
          fallback: 'style-loader',
          //resolve-url-loader may be chained before sass-loader if necessary
          use: ['css-loader', 'sass-loader']
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
        test: /\.(woff|ttf|eot|svg)$/,
        loader: 'file-loader'
      }
    ]
  },
  devtool: 'inline-source-map',
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
    new CopyWebpackPlugin([
      { from: 'bower_components', to: 'bower_components' },
      { from: 'data/public', to: 'data' },
      { from: 'data/private', to: 'data' }
    ]),
    new ExtractTextWebpackPlugin('style.css'),
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
    })
  ]
};
