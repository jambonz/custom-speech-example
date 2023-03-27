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
          assert.ok(!socket.voskConnection, 'Expect start only once per connection');

          const voskClient = await createVoskClient();

          const spec = new RecognitionSpec();
          spec.setAudioEncoding(RecognitionSpec.AudioEncoding.LINEAR16_PCM);
          spec.setSampleRateHertz(sampleRateHz);
          spec.setLanguageCode(language);
          spec.setPartialResults(interimResults);
          spec.setEnableWordTimeOffsets(true);

          const config = new RecognitionConfig();
          config.setSpecification(spec);

          socket.voskConnection = {
            client: voskClient,
            config: config,
            jambonz_req: obj
          };
          socket.audioBuffer = [];
        }
      } else {
        if (socket.voskConnection) {
          const { client, config, jambonz_req } = socket.voskConnection;
          socket.audioBuffer.push(data);
          if (socket.audioBuffer.length > 4) {
            const dataBuff = Buffer.concat(socket.audioBuffer);
            socket.audioBuffer = [];
            const request = new StreamingRecognitionRequest();
            request.setConfig(config);
            request.setAudioContent(dataBuff);

            client.streamingRecognize(request, (err, response) => {
              if (err) {
                console.error(err);
              }
              const chunks = response.getChunksList();
              logger.info(chunks);
              /* ignore interim results if not requested, or if basically empty */
              if (chunks.length === 0) return;
              let is_final = false;
              const alternatives = chunks.map((r) => {
                is_final = is_final ? is_final : r.getFinal();
                return {
                  confidence: r.confidence,
                  transcript: r.text,
                };
              });

              if (!is_final && !jambonz_req.interimResults) return;

              const obj = {
                type: 'transcription',
                is_final,
                alternatives,
                channel: 1,
                language: jambonz_req.language
              };
              socket.send(JSON.stringify(obj));
            });
          }
        }
      }
    } catch (err) {
      logger.error({err}, 'transcribeVosk: error');
    }
  });

  socket.on('error', (err) => {
    logger.error({err}, 'transcribeVosk: error');
  });
  socket.on('close', (data) => {
    logger.info({data}, 'transcribeVosk: close');
  });
  socket.on('end', (err) => {
    logger.error({err}, 'transcribeVosk: socket closed from jambonz');
  });
};

module.exports = transcribeVosk;

