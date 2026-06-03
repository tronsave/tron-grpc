#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

# Locate the protoc-gen-ts plugin: prefer the local devDependency, fall back to PATH.
PLUGIN="./node_modules/.bin/protoc-gen-ts"
[ -x "$PLUGIN" ] || PLUGIN="$(command -v protoc-gen-ts)"

# Clean previous generated files
rm -rf ./src/proto/*.js ./src/proto/*.ts ./src/proto/contract/*.js ./src/proto/contract/*.ts

protoc \
    --plugin=protoc-gen-ts="$PLUGIN" \
    --ts_out=optimize_code,optimize_code_size,long_type_string,grpc_js:./ \
    --proto_path ./ \
    ./src/proto/*.proto ./src/proto/contract/*.proto