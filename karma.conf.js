module.exports = function(config) {
  'use strict';

  config.set({
    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine', 'jasmine-diff'],

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
    webpack: require("./webpack.config.js"),
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
