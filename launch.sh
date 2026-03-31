#!/bin/bash

DAY=${1:-1}
DAY_PADDED=$(printf "day%02d" "$DAY")

npm install
npm run build
./clone-students.sh "$DAY" "$DAY"
./docker-test.sh -d "$DAY_PADDED" --all
npm run validate-etna -- -d "$DAY_PADDED" --send
