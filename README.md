# midja-map

[![Licence](https://img.shields.io/github/license/uq-eresearch/midja-map.svg)](https://github.com/uq-eresearch/midja-map/blob/master/COPYING)
[![Build Status](https://travis-ci.org/uq-eresearch/midja-map.svg?branch=master)](https://travis-ci.org/uq-eresearch/midja-map)

## Developing

`npm install` to fetch project dependencies.

To develop locally, run `npm run serve`. This should open up the map maker in the browser, and the dev server includes live-reload so it should reload the browser as you make changes to the source.

To test, run `npm test`. This will run Karma/Mocha tests using PhantomJS.

## Deploying

To build static files for hosting, run `npm run build`. This will transpile the source to HTML/JS/CSS suitable for the target browser versions, and stick the output in `dist/`.

To build the Docker container, first run `npm run build`, then `docker build -t midja-map .`. To build a [rkt](https://github.com/rkt/rkt/) ACI, use `build_aci.sh`.
