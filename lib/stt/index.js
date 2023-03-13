
const path = require('node:path');
const transcribe = async(logger, socket, url) => {
  const p = path.basename(url);
  switch (p) {
    case 'google':
      return require('./google')(logger, socket);
    case 'assemblyAi':
      return require('./assemblyAi')(logger, socket);
    default:
      logger.info(`unknown stt vendor: ${p}`);
      socket.close();
  }
};

module.exports = transcribe;
