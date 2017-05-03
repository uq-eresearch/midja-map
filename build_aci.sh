#!/bin/bash

set -ex

NAME=$(basename $(pwd))
TEMPORARY_IMAGE=$(mktemp --suffix .docker $NAME.XXXXXX)

sudo docker build -t $NAME .
sudo -v && sudo docker save $NAME > $TEMPORARY_IMAGE
docker2aci $TEMPORARY_IMAGE
rm $TEMPORARY_IMAGE
