const routes = require('express').Router();
const assert = require('assert');
const bent = require('bent');
const ELEVEN_URL = 'https://api.elevenlabs.io';

routes.post('/', async(req, res) => {
  const {logger} = req.app.locals;
  const {voice, text} = req.body;
  let client, opts;
  try {
    assert(process.env.ELEVEN_API_KEY, 'ELEVEN_API_KEY is not set');
    const startAt = process.hrtime();
    const post = bent(ELEVEN_URL, 'POST', 'buffer', {
      'X-Api-Key': process.env.ELEVEN_API_KEY,
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json'
    });
    const mp3 = await post(`/v1/text-to-speech/${voice}`, {
      text
    });
    const diff = process.hrtime(startAt);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    const rtt = time.toFixed(0);

    logger.info(`successfully synthesized speech using elevenlabs in ${rtt} ms`);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', mp3.length);
    res.send(mp3);
  } catch (err) {
    logger.info({err, opts}, 'synthAudio: Error synthesizing speech using elevenlabs');
    client && client.close();
    res.status(400).json({error: err.message});
    throw err;
  }
});

module.exports = routes;
