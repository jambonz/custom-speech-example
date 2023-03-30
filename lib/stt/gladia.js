const assert = require('assert');
const Websocket = require('ws');

const transcribeGladia = async(logger, socket) => {
  socket.on('message', async(data, isBinary) => {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        logger.info({ obj }, 'received JSON message from jambonz');
        if (obj.type === 'start') {
          const { language, sampleRateHz } = obj;
          assert.ok(!socket.gladiaSocket, 'Expect start only once per connection');
          const gladiaSocket = new Websocket('wss://api.gladia.io/audio/text/audio-transcription');
          socket.sampleRateHz = sampleRateHz;
          gladiaSocket
            .on('message', (buffer) => {
              const data = JSON.parse(buffer.toString());
              const obj = {
                type: 'transcription',
                is_final: true,
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
              logger.info('gladiaSocket: socket opened');
              socket.gladiaSocket = gladiaSocket;
            })
            .on('error', (err) => {
              logger.error({ err }, 'gladiaSocket: error');
            })
            .on('close', (data) => {
              logger.info({ data }, 'gladiaSocket: close');
              socket.gladiaSocket = null;
            })
            .on('end', (err) => {
              logger.info({ err }, 'gladiaSocket: socket closed from gladiaSocket');
            });
        } else if (obj.type === 'stop') {
          terminateAGladiaSocket(socket);
        }
      } else {
        if (socket.gladiaSocket) {
          const base64Data = data.toString('base64');
          const obj = {
            x_gladia_key: process.env.GLADIA_API_KEY,
            sample_rate: socket.sampleRateHz,
            frames: base64Data
          };
          const msg = JSON.stringify(obj);
          socket.gladiaSocket.send(msg);
        }
      }
    } catch (err) {
      logger.error({ err }, 'gladiaSocket: error');
    }
  });

  socket.on('error', (err) => {
    logger.error({err}, 'gladiaSocket: error');
  });
  socket.on('close', (data) => {
    logger.info({data}, 'gladiaSocket: close');
    terminateAGladiaSocket(socket);
  });
  socket.on('end', (err) => {
    logger.error({err}, 'gladiaSocket: socket closed from jambonz');

    terminateAGladiaSocket(socket);
  });
};

const terminateAGladiaSocket = (socket) => {
  if (socket.gladiaSocket) {
    socket.gladiaSocket.close();
    socket.gladiaSocket = null;
  }
};

module.exports = transcribeGladia;
