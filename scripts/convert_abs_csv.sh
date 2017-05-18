#!/bin/bash
#
# Takes an ABS CSV file (eg. 2011Census_I05A_AUST_SA2_long.csv) and turns it
# into a series of attribute JSON files (region→value map).

# Need csv2json (https://www.npmjs.com/package/csv2json) and
# jq (https://stedolan.github.io/jq/) installed!

CSV_FILE=$1
TMPFILE=$(mktemp series.XXXXXX)
trap "rm -f $TMPFILE" EXIT

JQ_EXTRACT_SERIES=$(cat <<'SCRIPT'
def extractKeys:
  .[0] | keys | map(select(. != "region_id"));

def extractSeries(k):
  k as $k |
  map({ key: .["region_id"], value: .[$k] }) | from_entries;

. as $data
| ($data | extractKeys) as $keys
| reduce $keys[] as $key ({}; . + { ($key): ($data | extractSeries($key)) } )
SCRIPT
)

csv2json $CSV_FILE | jq "$JQ_EXTRACT_SERIES" > $TMPFILE

IFS=$'\n' &&
for k in $(jq -r 'keys | .[]' $TMPFILE)
do
  LOWERCASE_K=$(echo $k | tr '[[:upper:]]' '[[:lower:]]')
  jq '.["'$k'"]' $TMPFILE > "$LOWERCASE_K.json"
done
