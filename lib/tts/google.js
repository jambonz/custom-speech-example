const routes = require('express').Router();
const ttsGoogle = require('@google-cloud/text-to-speech');
const fs = require('fs');
const assert = require('assert');
let credentials;

routes.post('/', async(req, res) => {
  const {logger} = req.app.locals;
  const {language, voice, type, text} = req.body;
  let client, opts;
  try {
    /* load credentials lazily */
    if (!credentials) {
      assert.ok(process.env.GCP_JSON_KEY_FILE, 'GCP_JSON_KEY_FILE env var is required for google speech');
      const json = fs.readFileSync(process.env.GCP_JSON_KEY_FILE, 'utf-8');
      credentials = JSON.parse(json);
    }

    client = new ttsGoogle.TextToSpeechClient({credentials});
    opts = {
      voice: {
        name: voice,
        languageCode: language,
        ssmlGender: 'SSML_VOICE_GENDER_UNSPECIFIED'
      },
      audioConfig: {audioEncoding: 'MP3'},
    };
    Object.assign(opts, {input: type === 'ssml' ? {ssml: text} : {text}});
    logger.info({opts, credentials}, 'sending synthesizeSpeech request to google');
    const responses = await client.synthesizeSpeech(opts);
    client.close();
    logger.info('successfully synthesized speech using google');
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', responses[0].audioContent.length);
    res.send(responses[0].audioContent);
  } catch (err) {
    logger.info({err, opts}, 'synthAudio: Error synthesizing speech using google');
    client && client.close();
    res.status(400).json({error: err.message});
    throw err;
  }
});

module.exports = routes;
