#!/bin/bash

# Exit early if any command fails
set -e

# Print all commands
set -x 

pwd


function readJson {  
  UNAMESTR=`uname`
  if [[ "$UNAMESTR" == 'Linux' ]]; then
    SED_EXTENDED='-r'
  elif [[ "$UNAMESTR" == 'Darwin' ]]; then
    SED_EXTENDED='-E'
  fi; 

  VALUE=`grep -m 1 "\"${2}\"" ${1} | sed ${SED_EXTENDED} 's/^ *//;s/.*: *"//;s/",?//'`

  if [ ! "$VALUE" ]; then
    echo "Error: Cannot find \"${2}\" in ${1}" >&2;
    exit 1;
  else
    echo $VALUE ;
  fi; 
}

if [ ! -f ./package-lock.json ]; then
    echo "package-lock.json not found!"
    exit 1;
fi

IMAGE_NAME=caprover/cli-caprover
CAPROVER_VERSION=`readJson package.json version` || exit 1; 

echo $IMAGE_NAME
echo $CAPROVER_VERSION


# ensure you're not running it on local machine
if [ -z "$CI" ] || [ -z "$GITHUB_REF" ]; then
    echo "Running on a local machine! Exiting!"
    exit 127
else
    echo "Running on CI"
fi


docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

export DOCKER_CLI_EXPERIMENTAL=enabled
docker buildx ls
docker buildx create --name mybuilder
docker buildx use mybuilder

docker buildx build --platform linux/amd64,linux/arm64,linux/arm -t $IMAGE_NAME:$CAPROVER_VERSION -t $IMAGE_NAME:latest -f dockerfile-captain.release --push .