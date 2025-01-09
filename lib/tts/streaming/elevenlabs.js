const Websocket = require('ws');

const ttsStreamingElevenlabs = async(logger, socket, url) => {
  // url is the last part of the url, e.g. elevenlabs and might contains query string
  // elevenlabs?voice=Xb7hH8MSUJpSbSDYk0k2&language=en&sampleRate=48000"
  // extract params from url to a map that later can be used to pass to the tts service
  const params = url.split('?')[1].split('&').reduce((acc, curr) => {
    const [key, value] = curr.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const {voice} = params;
  const base64_encoding = false;

  const elevenlabsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voice}/stream-input` +
    '?model_id=eleven_turbo_v2&output_format=pcm_16000';
  logger.info({elevenlabsUrl}, 'elevenlabsUrl');
  const ellSocket = new Websocket(elevenlabsUrl, {
    headers: {
      'xi-api-key': process.env.ELEVEN_API_KEY
    }
  });

  ellSocket
    .on('message', (buffer, isBinary) => {
      if (!isBinary) {
        const ellData = JSON.parse(buffer.toString());
        const {audio, error} = ellData;
        if (audio) {
          if (base64_encoding) {
            socket.send(JSON.stringify(
              {
                type: 'data',
                data: {
                  audio
                }
              }
            ));
          } else {
            socket.send(Buffer.from(audio, 'base64'), { binary: true });
          }
        } else if (error) {
          logger.error({error}, 'ttsStreamingElevenlabs: error');
          socket.send(JSON.stringify({error}));
        }
      }
    })
    .on('open', () => {
      logger.info('ttsStreamingElevenlabs: socket opened');
      socket.ellSocket = ellSocket;

      socket.send(JSON.stringify({
        type: 'connect',
        data: {
          sample_rate: 16000,
          base64_encoding
        } }));
    })
    .on('error', (err) => {
      logger.error({ err }, 'ttsStreamingElevenlabs: error');
    })
    .on('close', (data) => {
      logger.info({ data }, 'ttsStreamingElevenlabs: close');
      socket.ellSocket = null;
      socket.close();
    })
    .on('end', (err) => {
      logger.info({err}, 'ttsStreamingElevenlabs: socket closed from elevenlabs');
    });
  socket.on('message', async(data, isBinary) => {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        const {type}  = obj;
        logger.info({obj}, 'received JSON message from jambonz');

        switch (type) {
          case 'stream':
            const {text} = obj;
            socket.ellSocket.send(JSON.stringify({ text: `${text} ` }));
            break;
          case 'flush':
            socket.ellSocket.send(JSON.stringify({ text: ' ', flush: true }));
            break;
          case 'stop':
            terminateSocket(socket);
            break;
          default:
            break;
        }
      }
    } catch (err) {
      logger.error({ err }, 'ttsStreamingElevenlabs: error');
    }

    socket.on('error', (err) => {
      logger.error({err}, 'ttsStreamingElevenlabs: jambonz error');
    });
    socket.on('close', (data) => {
      logger.info({data}, 'ttsStreamingElevenlabs: jambonz close');
      terminateSocket(socket);
    });
    socket.on('end', (err) => {
      logger.error({err}, 'ttsStreamingElevenlabs: socket closed from jambonz');
      terminateSocket(socket);
    });
  });
};

const terminateSocket = (socket) => {
  if (socket.ellSocket) {
    socket.ellSocket.send(JSON.stringify({ text: '' }));
    socket.ellSocket.close();
    socket.ellSocket = null;
  }
};


module.exports = ttsStreamingElevenlabs;
