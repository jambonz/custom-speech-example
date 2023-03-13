const transcribe = async(logger, socket, path) => {
  switch (path) {
    case '/google':
      return require('./google')(logger, socket);
    case '/assemblyAi':
      return require('./assemblyAi')(logger, socket);

    default:
      logger.info({path}, 'unknown stt vendor');
      socket.destroy();
  }
};

module.exports = transcribe;
