#!/bin/bash

exec docker run \
  --volume $(pwd):/usr/src/app \
  --workdir /usr/src/app \
  --user $(id -u):$(id -g) \
  --env HOME=$(pwd) \
  node:${NODEJS_VERSION} \
  "$@"
