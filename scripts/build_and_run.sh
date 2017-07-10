#!/usr/bin/env sh
set -e
TMP_SCRIPT="${1/scripts/tmp}"
echo " ⏲  Compiling scripts"
$(npm bin)/webpack --config webpack.scripts.js
echo " ▶  Running $1"
node --require source-map-support/register "$TMP_SCRIPT" "${@:2}"
