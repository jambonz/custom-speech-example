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
          const {language, sampleRateHz, interimResults} = obj;
          assert.ok(!socket.stream, 'Expect start only once per connection');

          const voskClient = await createVoskClient();
          const stream = voskClient.streamingRecognize();
          const request = new StreamingRecognitionRequest();
          const spec = new RecognitionSpec();
          const config = new RecognitionConfig();
          spec.setAudioEncoding(RecognitionSpec.AudioEncoding.LINEAR16_PCM);
          spec.setSampleRateHertz(sampleRateHz);
          spec.setLanguageCode(language);
          spec.setPartialResults(interimResults);
          spec.setEnableWordTimeOffsets(false);
          config.setSpecification(spec);
          request.setConfig(config);
          stream.write(request);

          socket.stream = stream;

          stream.on('data', function(response) {
            const data = response.toObject();
            const {chunksList} = data;
            logger.info({data}, 'received data from vosk');
            if (!chunksList || chunksList.length === 0) return ;

            const is_final = chunksList[0].pb_final;
            logger.info({data}, 'sending transcription to jambonz');
            const obj = {
              type: 'transcription',
              is_final,
              alternatives:[{
                confidence: data.chunksList[0].alternativesList[0].confidence,
                transcript: data.chunksList[0].alternativesList[0].text,
              }],
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
        } else if (obj.type === 'stop') {
          closeVoskStream(socket);
        }
      } else {
        if (socket.stream) {
          const request = new StreamingRecognitionRequest();
          request.setAudioContent(data);
          socket.stream.write(request);
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
    socket.stream = null;
  }
  socket.close();
};

module.exports = transcribeVosk;

