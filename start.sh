#!/bin/bash

source .env || exit $?

docker build -t dosebot-plus . || exit $?

docker stop dosebot-plus
docker rm dosebot-plus
docker run \
    --name dosebot-plus \
    --network host \
    -d \
    --env DISCORD_TOKEN="$DISCORD_TOKEN" \
    dosebot-plus
