const Websocket = require('ws');
const assert = require('assert');
const GLADIA_URL = 'wss://api.gladia.io/audio/text/audio-transcription';

const transcribe = async(logger, socket) => {
  socket.on('message', async(data, isBinary) => {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        logger.info({obj}, 'received JSON message from jambonz');
        assert.ok(process.env.GLADIA_API_KEY, 'GLADIA_API_KEY is required');

        if (obj.type === 'start') {
          const {language, sampleRateHz, interimResults } = obj;
          assert.ok(!socket.gladiaSocket, 'Expect start only once per connection');

          /* need to fix this */
          const lang = language === 'en-US' ? 'english' : language;
          const gladiaSocket = new Websocket(GLADIA_URL);
          gladiaSocket
            .on('message', (buffer) => {
              const data = JSON.parse(buffer.toString());
              if (!data.type) return;
              const is_final = data.type === 'final';
              logger.info(data);

              /* ignore interim results if not requested, or if basically empty */
              if (!is_final && !interimResults) return;
              if (!is_final && data.transcription?.length === 0) return;

              const obj = {
                type: 'transcription',
                is_final,
                alternatives: [
                  {
                    confidence: data.confidence,
                    transcript: data.transcription,
                  }
                ],
                channel: 1,
                language
              };
              socket.send(JSON.stringify(obj));
            })
            .on('open', () => {
              logger.info('transcribe: socket opened');
              socket.audioBuffer = [];
              socket.gladiaSocket = gladiaSocket;

              /* send initial configuration */
              socket.gladiaSocket.send(JSON.stringify({
                x_gladia_key: process.env.GLADIA_API_KEY,
                sample_rate: sampleRateHz,
                encoding: 'wav',
                language: lang
              }));
            })
            .on('error', (err) => {
              logger.error({ err }, 'transcribeAssemblyAi: error');
            })
            .on('close', (data) => {
              logger.info({ data }, 'transcribeAssemblyAi: close');
              socket.gladiaSocket = null;
            })
            .on('end', (err) => {
              logger.info({err}, 'transcribeAssemblyAi: socket closed from assemblyAi');
            });
        } else if (obj.type === 'stop') {
          terminateSocket(socket);
        }
      }
      else {
        if (socket.gladiaSocket) {
          socket.audioBuffer.push(data);

          /* gladia doesnt require this but we're buffering a few frames of audio data before sending */
          if (socket.audioBuffer.length > 2) {
            const base64Data = Buffer.concat(socket.audioBuffer).toString('base64');
            socket.audioBuffer = [];
            const msg = JSON.stringify({ frames: base64Data });
            socket.gladiaSocket.send(msg);
          }
        }
      }
    } catch (err) {
      logger.error({err}, 'transcribe: error');
    }
  });

  socket.on('error', (err) => {
    logger.error({err}, 'transcribe: error');
  });
  socket.on('close', (data) => {
    logger.info({data}, 'transcribe: close');
    terminateSocket(socket);
  });
  socket.on('end', (err) => {
    logger.error({err}, 'transcribe: socket closed from jambonz');

    terminateSocket(socket);
  });
};

const terminateSocket = (socket) => {
  if (socket.assemblyAiSocket) {
    socket.assemblyAiSocket.send(JSON.stringify({ terminate_session: true }));
    socket.assemblyAiSocket.close();
    socket.assemblyAiSocket = null;
  }
};

module.exports = transcribe;
