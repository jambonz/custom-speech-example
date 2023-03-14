const Websocket = require('ws');
const assert = require('assert');
const bent = require('bent');

const getTempAuthToken = async(logger) => {
  try {
    const post = bent('POST', 'json', {
      'Authorization': process.env.ASSEMBLY_AI_API_TOKEN,
      'Accept': 'audio/json',
      'Content-Type': 'application/json'
    });

    const token = await post('https://api.assemblyai.com/v2/realtime/token',
      { expires_in: (process.env.ASSEMBLY_API_EXPIRED_IN_MINS || 5) * 60});
    return token;
  } catch (err) {
    logger.info({err}, `Cannot fetch Assembly Authentication token ${err}`);
    throw err;
  }
};

const transcribeAssemblyAi = async(logger, socket) => {

  const token = await getTempAuthToken(logger);
  logger.info({token}, 'transcribeAssemblyAi: got token');

  socket.on('message', (data, isBinary) => {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        logger.info({obj}, 'received JSON message from jambonz');

        if (obj.type === 'start') {
          assert.ok(!socket.recognizeStream, 'Expect start only once per connection');
          const {sampleRateHz} = obj;
          const assemblyAiSocket = new
          Websocket(`wss://api.assemblyai.com/v2/realtime/ws?
          sample_rate=${sampleRateHz}
          &token=${process.env.ASSEMBLY_AI_API_TOKEN}`);

          assemblyAiSocket.on('message', (data) => {
            logger.info({data, results: data.results[0]}, 'received data from recognize stream');
            if (data.results?.length > 0) {
              const obj = {
                type: 'transcription',
                is_final: data.message_type === 'FinalTranscript',
                alternatives: data.words.map((alt) => {
                  return {
                    confidence: alt.confidence,
                    transcript: alt.text
                  };
                }),
                channel: null,
                language: null
              };
              obj.alternatives = [
                ...obj.alternatives,
                {
                  confidence: data.confidence,
                  transcript: data.text
                }
              ];
              socket.send(JSON.stringify(obj));
            }
          });

          assemblyAiSocket.on('open', () => {
            logger.info('transcribeAssemblyAi: socket opened');
            socket.assemblyAiSocket = assemblyAiSocket;
          });

          assemblyAiSocket.on('error', function(err) {
            logger.error({err}, 'transcribeAssemblyAi: error');
          });

          assemblyAiSocket.on('close', (data) => {
            logger.info({data}, 'transcribeAssemblyAi: close');
          });

          assemblyAiSocket.on('end', function(err) {
            logger.error({err}, 'transcribeAssemblyAi: socket closed from jambonz');
          });

        }
      } else {
        if (socket.assemblyAiSocket) {
          socket.assemblyAiSocket.send(JSON.stringify({audio_data: Buffer.from(data, 'base64')}));
        }
      }
    } catch (err) {
      logger.error({err}, 'transcribeAssemblyAi: error parsing message during connection');
    }
  });

  socket.on('error', function(err) {
    logger.error({err}, 'transcribeAssemblyAi: error');
  });
  socket.on('close', (data) => {
    logger.info({data}, 'transcribeAssemblyAi: close');
    socket.assemblyAiSocket.close();
  });
  socket.on('end', function(err) {
    logger.error({err}, 'transcribeAssemblyAi: socket closed from jambonz');
    socket.assemblyAiSocket.close();
  });
};

module.exports = transcribeAssemblyAi;
