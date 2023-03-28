const { SttServiceClient } = require('../../stubs/vosk/vosk_stt_grpc_pb');
const { StreamingRecognitionRequest, RecognitionConfig,
  RecognitionSpec } = require('../../stubs/vosk/vosk_stt_pb');
const grpc = require('@grpc/grpc-js');
const assert = require('assert');

const createVoskClient = async() => {
  const client = new SttServiceClient(process.env.VOSK_URL, grpc.credentials.createInsecure());
  return client;
};

const transcribeVosk = async(logger, socket) => {
  socket.on('message', async(data, isBinary) => {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        logger.info({obj}, 'received JSON message from jambonz');

        if (obj.type === 'start') {
          const {language, sampleRateHz, interimResults } = obj;
          assert.ok(!socket.stream, 'Expect start only once per connection');

          const voskClient = await createVoskClient();

          const spec = new RecognitionSpec();
          spec.setAudioEncoding(RecognitionSpec.AudioEncoding.LINEAR16_PCM);
          spec.setSampleRateHertz(sampleRateHz);
          spec.setLanguageCode(language);
          spec.setPartialResults(interimResults);
          spec.setMaxAlternatives(5);
          spec.setEnableWordTimeOffsets(true);

          const config = new RecognitionConfig();
          config.setSpecification(spec);

          const request = new StreamingRecognitionRequest();
          request.setConfig(config);

          const stream = voskClient.streamingRecognize(request);

          stream.on('data', function(response) {
            console.log(response);
            const chunks = response.getChunksList();
            logger.info(chunks);

            if (chunks.length === 0) return;
            let is_final = false;
            const alternatives = chunks.map((r) => {
              is_final = is_final ? is_final : r.getFinal();
              return {
                confidence: r.confidence,
                transcript: r.text,
              };
            });
            if (!is_final && !interimResults) return;
            const obj = {
              type: 'transcription',
              is_final,
              alternatives,
              channel: 1,
              language: language
            };
            socket.send(JSON.stringify(obj));
          });

          stream.on('error', function(error) {
            console.log(error);
          });

          stream.on('end', function() {
            console.log('Stream ended');
          });
          socket.audioBuffer = [];
          socket.stream = stream;
        } else if (obj.type === 'stop') {
          closeVoskStream(socket);
        }
      } else {
        if (socket.stream) {
          socket.audioBuffer.push(data);

          if (socket.audioBuffer.length > 4) {
            const request = new StreamingRecognitionRequest();
            request.setAudioContent(socket.audioBuffer);
            socket.stream.write(request);
            socket.audioBuffer = [];
          }
        }
      }
    } catch (err) {
      logger.error({err}, 'transcribeVosk: error');
      closeVoskStream(socket);
    }
  });

  socket.on('error', (err) => {
    logger.error({err}, 'transcribeVosk: error');
    closeVoskStream(socket);
  });
  socket.on('close', (data) => {
    logger.info({data}, 'transcribeVosk: close');
    closeVoskStream(socket);
  });
  socket.on('end', (err) => {
    logger.error({err}, 'transcribeVosk: socket closed from jambonz');
    closeVoskStream(socket);
  });
};

const closeVoskStream = (socket) => {
  if (socket.stream) {
    socket.stream.end();
  }
};

module.exports = transcribeVosk;

