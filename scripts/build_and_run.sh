#!/usr/bin/env sh
set -e
# Redirect stdout to stderr
exec 3>&1 1>&2
TMP_SCRIPT="${1/scripts/tmp}"
echo " ⏲  Compiling scripts"
$(npm bin)/webpack --config webpack.scripts.js
echo " ▶  Running $1"
# Restore stdout
exec 1>&3 3>&-
node --require source-map-support/register "$TMP_SCRIPT" "${@:2}"
