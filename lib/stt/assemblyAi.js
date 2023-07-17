const Websocket = require('ws');
const assert = require('assert');
const bent = require('bent');
const AI_URL = 'wss://api.assemblyai.com/v2/realtime/ws';

const getAuthToken = async(logger) => {
  try {
    const post = bent('POST', 'json', {
      Authorization: process.env.ASSEMBLY_AI_API_TOKEN,
      Accept: 'audio/json',
      'Content-Type': 'application/json',
    });

    const { token } = await post(
      'https://api.assemblyai.com/v2/realtime/token',
      { expires_in: (process.env.ASSEMBLY_API_EXPIRED_IN_MINS || 5) * 60 }
    );
    return token;
  } catch (err) {
    logger.info({ err }, `Cannot fetch Assembly Authentication token ${err}`);
    throw err;
  }
};

const transcribeAssemblyAi = async(logger, socket) => {
  socket.on('message', async(data, isBinary) => {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        logger.info({obj}, 'received JSON message from jambonz');

        if (obj.type === 'start') {
          const {language, sampleRateHz, interimResults } = obj;
          assert.ok(!socket.assemblyAiSocket, 'Expect start only once per connection');

          const token = await getAuthToken(logger);
          logger.info({token, sampleRateHz}, 'transcribeAssemblyAi: got token');

          const assemblyAiSocket = new Websocket(
            `${AI_URL}?sample_rate=${sampleRateHz}&language_code=${language}&token=${token}`
          );
          assemblyAiSocket
            .on('message', (buffer) => {
              const data = JSON.parse(buffer.toString());
              const is_final = data.message_type === 'FinalTranscript';
              logger.info(data);

              if (!data.message_type || [ 'SessionBegins'].includes(data.message_type)) return;

              /* ignore interim results if not requested, or if basically empty */
              if (!is_final && !interimResults) return;
              if (!is_final && data.words.length === 0) return;

              const obj = {
                type: 'transcription',
                is_final,
                alternatives: [
                  {
                    confidence: data.confidence,
                    transcript: data.text,
                  }
                ],
                channel: 1,
                language
              };
              socket.send(JSON.stringify(obj));
            })
            .on('open', () => {
              logger.info('transcribeAssemblyAi: socket opened');
              socket.audioBuffer = [];
              socket.assemblyAiSocket = assemblyAiSocket;
            })
            .on('error', (err) => {
              logger.error({ err }, 'transcribeAssemblyAi: error');
            })
            .on('close', (data) => {
              logger.info({ data }, 'transcribeAssemblyAi: close');
              socket.assemblyAiSocket = null;
              socket.close();
            })
            .on('end', (err) => {
              logger.info({err}, 'transcribeAssemblyAi: socket closed from assemblyAi');
            });
        } else if (obj.type === 'stop') {
          terminateAssemblySocket(socket);
        }
      }
      else {
        if (socket.assemblyAiSocket) {
          socket.audioBuffer.push(data);

          /* we buffer because assemblyAI requires at least 100ms of audio data in each frame */
          if (socket.audioBuffer.length > 4) {
            const base64Data = Buffer.concat(socket.audioBuffer).toString('base64');
            socket.audioBuffer = [];
            const msg = JSON.stringify({ audio_data: base64Data });
            socket.assemblyAiSocket.send(msg);
          }
        }
      }
    } catch (err) {
      logger.error({err}, 'transcribeAssemblyAi: error');
    }
  });

  socket.on('error', (err) => {
    logger.error({err}, 'transcribeAssemblyAi: error');
  });
  socket.on('close', (data) => {
    logger.info({data}, 'transcribeAssemblyAi: close');
    terminateAssemblySocket(socket);
  });
  socket.on('end', (err) => {
    logger.error({err}, 'transcribeAssemblyAi: socket closed from jambonz');

    terminateAssemblySocket(socket);
  });
};

const terminateAssemblySocket = (socket) => {
  if (socket.assemblyAiSocket) {
    socket.assemblyAiSocket.send(JSON.stringify({ terminate_session: true }));
    socket.assemblyAiSocket.close();
    socket.assemblyAiSocket = null;
  }
};

module.exports = transcribeAssemblyAi;
