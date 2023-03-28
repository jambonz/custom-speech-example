#!/bin/sh

mkdir -p ./stubs/vosk

for FILE in ./protos/vosk/*; do 
  ./node_modules/.bin/grpc_tools_node_protoc   \
  --js_out=import_style=commonjs,binary:./stubs/vosk \
  --grpc_out=grpc_js:./stubs/vosk \
  --proto_path=./protos/vosk  \
  $FILE
done