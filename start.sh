#!/bin/bash

docker build -t dose-gpt . || exit $?

docker stop dose-gpt
docker rm dose-gpt
docker run \
    --name dose-gpt \
    --network host \
    -d \
    --env DISCORD_TOKEN="$DISCORD_TOKEN" \
    dose-gpt
