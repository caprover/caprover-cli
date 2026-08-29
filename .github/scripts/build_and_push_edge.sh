#!/bin/bash

# Exit early if any command fails
set -e

# Print all commands
set -x

pwd

# ensure you're not running it on local machine
if [ -z "$CI" ] || [ -z "$GITHUB_REF" ]; then
    echo "Running on a local machine! Exiting!"
    exit 127
else
    echo "Running on CI"
fi

CAPROVER_VERSION=edge
IMAGE_NAME=caprover/cli-caprover

if [ ! -f ./package-lock.json ]; then
    echo "package-lock.json not found!"
    exit 1
fi

# BRANCH=$(git rev-parse --abbrev-ref HEAD)
# On Github the line above does not work, instead:
BRANCH=${GITHUB_REF##*/}
echo "on branch $BRANCH"
if [[ "$BRANCH" != "master" ]]; then
    echo 'Not on master branch! Aborting script!'
    exit 1
fi

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "$IMAGE_NAME:$CAPROVER_VERSION" \
    -f Dockerfile \
    --push \
    .
