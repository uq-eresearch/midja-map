var R = require('ramda')

module.exports = function(config) {
  'use strict';

  config.set({
    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['mocha'],

    // list of files / patterns to load in the browser
    files: [
      'test/tests.webpack.js'
    ],

    browsers: [
      'PhantomJS'
    ],

    preprocessors: {
      'test/tests.webpack.js': ["webpack", "sourcemap"]
    },

    // webpack configuration
    webpack: R.merge(
      require("./webpack.config.js"),
      {
        devtool: 'inline-source-map',
      }),
    webpackMiddleware: {
      stats: "errors-only"
    },

    phantomjsLauncher: {
      // Have phantomjs exit if a ResourceError is encountered (useful if karma exits without killing phantom)
      exitOnResourceError: true
    },

    reporters: ['progress']
  });
};
