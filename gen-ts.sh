#!/bin/bash

# Clean previous generated files
rm -rf ./src/proto/*.js ./src/proto/*.ts ./src/proto/contract/*.js ./src/proto/contract/*.ts

protoc \
    --plugin=protoc-gen-ts=`which protoc-gen-ts` \
    --ts_out=optimize_code,optimize_code_size,long_type_string,grpc_js:./ \
    --proto_path ./ \
    ./src/proto/*.proto ./src/proto/contract/*.proto