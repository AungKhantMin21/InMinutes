import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const ZARLA_KEYTERMS = [
  "JARVIS",
  "Bahozay",
  "Cannopy",
  "InFlow",
  "InMinutes",
  "InKnow",
  "Inductiv",
  "Argent Blue",
  "Zarla",
  "Cho Cho",
  "LangGraph",
  "Kafka",
  "Debezium",
  "ClickHouse",
];

export async function transcribeAudio(audioBuffer, mimeType, speakersExpected) {
  const blob = new Blob([audioBuffer], { type: mimeType });

  const response = await client.speechToText.convert({
    audio: blob,
    model_id: "scribe_v2",
    language_code: "mya",
    diarize: true,
    timestamps_granularity: "word",
    keyterms: ZARLA_KEYTERMS,
    ...(speakersExpected ? { num_speakers: speakersExpected } : {}),
  });

  return mapScribeResponse(response);
}

function mapScribeResponse(response) {
  const segments = [];
  let current = null;

  for (const word of response.words) {
    if (word.type === "spacing") continue;

    if (!current || current.speaker !== word.speaker_id) {
      if (current) segments.push(current);
      current = {
        speaker: word.speaker_id ?? "speaker_0",
        text: word.text,
        start: Math.round(word.start * 1000),
        end: Math.round(word.end * 1000),
      };
    } else {
      current.text += " " + word.text;
      current.end = Math.round(word.end * 1000);
    }
  }
  if (current) segments.push(current);

  return segments.map((seg) => ({
    ...seg,
    originalLang: detectLang(seg.text),
    translatedText: null,
  }));
}

function detectLang(text) {
  const hasBurmese = /[က-႟]/.test(text);
  const hasLatin = /[a-zA-Z]{3,}/.test(text);
  if (hasBurmese && hasLatin) return "my-en";
  if (hasBurmese) return "my";
  return "en";
}
