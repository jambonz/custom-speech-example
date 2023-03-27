// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var vosk_stt_pb = require('./vosk_stt_pb.js');
var google_protobuf_duration_pb = require('google-protobuf/google/protobuf/duration_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vosk_stt_v1_StatsResponse(arg) {
  if (!(arg instanceof vosk_stt_pb.StatsResponse)) {
    throw new Error('Expected argument of type vosk.stt.v1.StatsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vosk_stt_v1_StatsResponse(buffer_arg) {
  return vosk_stt_pb.StatsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vosk_stt_v1_StreamingRecognitionRequest(arg) {
  if (!(arg instanceof vosk_stt_pb.StreamingRecognitionRequest)) {
    throw new Error('Expected argument of type vosk.stt.v1.StreamingRecognitionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vosk_stt_v1_StreamingRecognitionRequest(buffer_arg) {
  return vosk_stt_pb.StreamingRecognitionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vosk_stt_v1_StreamingRecognitionResponse(arg) {
  if (!(arg instanceof vosk_stt_pb.StreamingRecognitionResponse)) {
    throw new Error('Expected argument of type vosk.stt.v1.StreamingRecognitionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vosk_stt_v1_StreamingRecognitionResponse(buffer_arg) {
  return vosk_stt_pb.StreamingRecognitionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var SttServiceService = exports.SttServiceService = {
  streamingRecognize: {
    path: '/vosk.stt.v1.SttService/StreamingRecognize',
    requestStream: true,
    responseStream: true,
    requestType: vosk_stt_pb.StreamingRecognitionRequest,
    responseType: vosk_stt_pb.StreamingRecognitionResponse,
    requestSerialize: serialize_vosk_stt_v1_StreamingRecognitionRequest,
    requestDeserialize: deserialize_vosk_stt_v1_StreamingRecognitionRequest,
    responseSerialize: serialize_vosk_stt_v1_StreamingRecognitionResponse,
    responseDeserialize: deserialize_vosk_stt_v1_StreamingRecognitionResponse,
  },
};

exports.SttServiceClient = grpc.makeGenericClientConstructor(SttServiceService);
var StatsServiceService = exports.StatsServiceService = {
  getStats: {
    path: '/vosk.stt.v1.StatsService/GetStats',
    requestStream: false,
    responseStream: false,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: vosk_stt_pb.StatsResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_vosk_stt_v1_StatsResponse,
    responseDeserialize: deserialize_vosk_stt_v1_StatsResponse,
  },
};

exports.StatsServiceClient = grpc.makeGenericClientConstructor(StatsServiceService);
