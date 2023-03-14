# custom-speech-example

This is an example http/webserver application showing how to add support for a custom speech vendor to [jambonz](https://jambonz.org) using the speech API.  We show examples for both google (stt and tts) and assemblyAI (stt).

## Running
```bash
npm ci
API_KEY=<foobarwhatever> \
GCP_JSON_KEY_FILE=<google-json-key-path> \
ASSEMBLY_AI_API_TOKEN=<assemblyai-api-key> \
HTTP_PORT=3000 node app.js
```

Then, in the jambonz portal create custom speech vendors for google and/or assemblyAI, providing the wss (for STT) and http(s) (for TTS) URLs to your server, and your api key (foobarwhatever).

After adding the custom speech vendors you can use them in a jambonz application.  Make sure this application is running and accessible at the URLs you provisioned into jambonz.
