const Websocket = require("ws");
const assert = require("assert");
const bent = require("bent");

const getTempAuthToken = async (logger) => {
  try {
    const post = bent("POST", "json", {
      Authorization: process.env.ASSEMBLY_AI_API_TOKEN,
      Accept: "audio/json",
      "Content-Type": "application/json",
    });

    const { token } = await post(
      "https://api.assemblyai.com/v2/realtime/token",
      { expires_in: (process.env.ASSEMBLY_API_EXPIRED_IN_MINS || 5) * 60 }
    );
    return token;
  } catch (err) {
    logger.info({ err }, `Cannot fetch Assembly Authentication token ${err}`);
    throw err;
  }
};

const transcribeAssemblyAi = async (logger, socket) => {
  socket.on("message", (data, isBinary) => {
    try {
      if (!isBinary) {
        const obj = JSON.parse(data.toString());
        logger.info({ obj }, "received JSON message from jambonz");

        if (obj.type === "start") {
          assert.ok(
            !socket.assemblyAiSocket,
            "Expect start only once per connection"
          );
          const { sampleRateHz } = obj;

          getTempAuthToken(logger).then((token) => {
            logger.info({ token }, "transcribeAssemblyAi: got token");

            let assemblyAiSocket = new Websocket(
              `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRateHz}&token=${token}`
            );
            assemblyAiSocket.onmessage = (data) => {
              const d = JSON.parse(data.data.toString());
              logger.info(d);
              if (d.words && d.words.length > 0) {
                const obj = {
                  type: "transcription",
                  is_final: d.message_type === "FinalTranscript",
                  alternatives: d.words.map((alt) => {
                    return {
                      confidence: alt.confidence,
                      transcript: alt.text,
                    };
                  }),
                  channel: null,
                  language: null,
                };
                obj.alternatives = [
                  ...obj.alternatives,
                  {
                    confidence: d.confidence,
                    transcript: d.text,
                  },
                ];
                socket.send(JSON.stringify(obj));
              }
            };
            assemblyAiSocket.onopen = ({target}) => {
              logger.info("transcribeAssemblyAi: socket opened");
              socket.assemblyAiSocket = target;
            };

            assemblyAiSocket.onerror = (err) => {
              logger.error({ err }, "transcribeAssemblyAi: error");
            };

            assemblyAiSocket.onclose = (data) => {
              logger.info({ data }, "transcribeAssemblyAi: close");
            };

            assemblyAiSocket.onend = (err) => {
              logger.error(
                { err },
                "transcribeAssemblyAi: socket closed from assemblyAi"
              );
            };
          });
        } else if (obj.type === "stop") {
          terminateAssemblySocket(socket);
        }
      } else {
        if (socket.assemblyAiSocket) {
          socket.assemblyAiSocket.send(
            JSON.stringify({
              audio_data: Buffer.from(data)
                .toString("base64")
                .substring(0, 40000),
            })
          );
        }
      }
    } catch (err) {
      logger.error(
        { err },
        "transcribeAssemblyAi: error parsing message during connection"
      );
    }
  });

  socket.on("error", function (err) {
    logger.error({ err }, "transcribeAssemblyAi: error");
  });
  socket.on("close", (data) => {
    logger.info({ data }, "transcribeAssemblyAi: close");
    terminateAssemblySocket(socket);
  });
  socket.on("end", function (err) {
    logger.error({ err }, "transcribeAssemblyAi: socket closed from jambonz");

    terminateAssemblySocket(socket);
  });
};

const terminateAssemblySocket = (socket) => {
  if (socket.assemblyAiSocket) {
    socket.assemblyAiSocket.send(JSON.stringify({ terminate_session: true }));
    socket.assemblyAiSocket.close();
    socket.assemblyAiSocket = null;
  }
} 

module.exports = transcribeAssemblyAi;
