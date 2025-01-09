
const path = require('node:path');
const transcribe = async(logger, socket, url) => {
  const p = path.basename(url);
  // p is the last part of the url, e.g. elevenlabs and might contains query string
  // elevenlabs?voice=Xb7hH8MSUJpSbSDYk0k2&language=en&sampleRate=48000"
  const vendor = p.split('?')[0];
  switch (vendor) {
    case 'elevenlabs':
      return require('./elevenlabs')(logger, socket, url);
    default:
      logger.info(`unknown tts streaming vendor: ${p}`);
      socket.close();
  }
};

module.exports = transcribe;
