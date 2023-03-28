# custom-speech-example

This is an example http/webserver application showing how to add support for a custom speech vendor to [jambonz](https://jambonz.org) using the speech API.  It includes the following examples:
- TTS: [google](https://cloud.google.com/text-to-speech/docs), 
- STT: [google](https://cloud.google.com/speech-to-text), [assemblyAI](https://www.assemblyai.com/docs/walkthroughs#realtime-streaming-transcription), and [Vosk](https://alphacephei.com/vosk/server).

## Configuration

You can configure the application to connect to all of the providers or just some depending on the environment variables supplied.

- To use google, supply GCP_JSON_KEY_FILE pointing to your google json key
- To use assemblyAI, supply ASSEMBLY_AI_API_TOKEN which has your assemblyAI api key
- To use Vosk, supply VOSK_URL which has the ip:port of the Vosk server grpc endpoint
## Running
```bash
$ npm ci

$ API_KEY=<foobarwhatever> \
GCP_JSON_KEY_FILE=<google-json-key-path> \
ASSEMBLY_AI_API_TOKEN=<assemblyai-api-key> \
VOSK_URL=xxxx:yyyy
HTTP_PORT=3000 node app.js
```

Then, in the jambonz portal create a custom speech vendor, providing the wss (for STT) and http(s) (for TTS) URLs to your server, and your api key (foobarwhatever).

After adding the custom speech vendors you can use them in a jambonz application.  Make sure this application is running and accessible at the URLs you provisioned into jambonz.

>> A simple app you might use to test with is [jambonz-echo-test](https://github.com/jambonz/jambonz-echo-test).

Enjoy!
