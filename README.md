# midja-map

[![Build Status](https://travis-ci.org/uq-eresearch/midja-map.svg?branch=master)](https://travis-ci.org/uq-eresearch/midja-map)

## Getting it Running

So, to get started you need npm, then

* Install bower, grunt `npm install -g yo bower grunt-cli`

In the project directory
* Install node modules `npm install`
* Install bower packages `bower install`

Running locally
* Run `grunt serve`. This will serve the files in `app/`. It should open up the map maker in the browser. It uses a proxy to request data from the server (so no CORS issues). So now you can edit the files in `app/` and it includes live-reload so it should reload the browser as you make changes to the source.

Building
* Run `grunt build`. This will minify uglify and a bunch of other stuff to the files in `app/` and stick the output files in `dist/`.

Testing
* Run `grunt test`. This will run Karma/Jasmine tests using PhantomJS.

Building & Deploying to GitHub Pages
* Run `grunt deploy`. This includes the `grunt build` and `grunt gh-pages` steps.

Building & Deploying as Docker container
* Run `grunt build`, then `docker build -t midja-map .`
