# midja-map

[![Build Status](https://travis-ci.org/uq-eresearch/midja-map.svg?branch=master)](https://travis-ci.org/uq-eresearch/midja-map)

## Getting it Running

So, to get started you need npm, then in the project directory:
* Install node modules `npm install`

Running locally
* Run `npm run serve`. This will serve the files in `app/`. It should open up the map maker in the browser. It uses a proxy to request data from the server (so no CORS issues). So now you can edit the files in `app/` and it includes live-reload so it should reload the browser as you make changes to the source.

Building
* Run `npm run build`. This will minify uglify and a bunch of other stuff to the files in `app/` and stick the output files in `dist/`.

Testing
* Run `npm test`. This will run Karma/Jasmine tests using PhantomJS.

Building & Deploying as Docker container
* Run `npm run build`, then `docker build -t midja-map .`
