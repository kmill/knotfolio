#!/bin/bash

set -e

tests=$(find src -iname '*.test.*js')

for test in $tests
do
    echo $test
    node --experimental-modules $test
done
