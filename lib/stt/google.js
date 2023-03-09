const speech = require('@google-cloud/speech');
const Websocket = require('ws');
const fs = require('fs');
const assert = require('assert');

const transcribeGoogle = async(logger, socket) => {
  assert.ok(process.env.GCP_JSON_KEY_FILE, 'GCP_JSON_KEY_FILE env var is required for google speech');
  const json = fs.readFileSync(process.env.GCP_JSON_KEY_FILE);
  const credentials = JSON.parse(json);
  const client = new speech.SpeechClient({credentials});

  socket.on('message', function(data, isBinary) {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        logger.info({obj}, 'received JSON message from jambonz');
        if (obj.type === 'start') {
          assert.ok(!socket.recognizeStream, 'Expect start only once per connection');
          const {language, sampleRateHz, interimResults} = obj;
          socket.recognizeStream = client.streamingRecognize({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: sampleRateHz,
              languageCode: language
            },
            interimResults
          })
            .on('error', (err) => {
              logger.error({err}, 'error in recognize stream');
              socket.send(JSON.stringify({
                type: 'error',
                error: err.message
              }));
            })
            .on('data', (data) => {
              logger.info({data, results: data.results[0]}, 'received data from recognize stream');
              if (data.results?.length > 0) {
                const obj = {
                  type: 'transcription',
                  is_final: data.results[0].isFinal,
                  alternatives: data.results[0].alternatives.map((alt) => {
                    return {
                      confidence: alt.confidence,
                      transcript: alt.transcript
                    };
                  }),
                  channel: data.results[0].channelTag,
                  language: data.results[0].languageCode
                };
                socket.send(JSON.stringify(obj));
              }
            })
            .on('end', () => {
              logger.info('recognize stream ended from google');
            });

          /* start streaming data */
          const duplex = socket.duplex = Websocket.createWebSocketStream(socket);
          duplex.pipe(socket.recognizeStream);
        }
        else if (obj.type === 'stop') {
          if (socket.duplex) {
            /* stop sending audio */
            socket.duplex.unpipe(socket.recognizeStream);
            socket.duplex = null;
          }
          socket.recognizeStream.end();
          socket.recognizeStream.removeAllListeners('data');
          socket.recognizeStream = null;
          socket.close();
        }
      }
    } catch (err) {
      logger.error({err}, 'error parsing message during connection');
    }
  });
  socket.on('error', function(err) {
    logger.error({err}, 'transcribeGoogle: error');
  });
  socket.on('end', function(err) {
    logger.error({err}, 'transcribeGoogle: socket closed from jambonz');
  });
};

module.exports = transcribeGoogle;
