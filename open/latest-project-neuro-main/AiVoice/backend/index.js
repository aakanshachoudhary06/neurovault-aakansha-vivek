import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai/index.mjs";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "uYXf8XasLslADfZ2MB4u";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  // List of valid animation names
  const validAnimations = ["idle", "waving", "thinking", "talking1", "talking2", "talking3"];
  // Helper to get a random talking animation
  const getRandomTalking = () => {
    const talking = ["talking1", "talking2", "talking3"];
    return talking[Math.floor(Math.random() * talking.length)];
  };
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Think of me as your voice-powered vault — here to listen, remember, and maybe vibe a little.",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          facialExpression: "smile",
          animation: getRandomTalking(),
        },
        {
          text: "Talk to me, I'm all ears!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          facialExpression: "happy",
          animation: "thinking",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          facialExpression: "angry",
          animation: "idle",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          facialExpression: "smile",
          animation: getRandomTalking(),
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    max_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        You are a virtual girlfriend.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: idle, waving, thinking, talking1, talking2, talking3.
        For any talking or speaking response, always use one of: talking1, talking2, or talking3.
        `,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });
  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // Fix animation name if invalid
    if (!validAnimations.includes(message.animation)) {
      // If the message is talking, use a talking animation, else fallback to idle
      if (message.text && message.text.length > 0) {
        message.animation = getRandomTalking();
      } else {
        message.animation = "idle";
      }
    }
    // generate audio file
    const fileName = `audios/message_${i}.mp3`; // The name of your audio file
    const textInput = message.text; // The text you wish to convert to speech
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    message.audio = await audioFileToBase64(fileName);
  }

  res.send({ messages });
});

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});
