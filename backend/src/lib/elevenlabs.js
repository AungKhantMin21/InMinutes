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
  "အစည်းအဝေး",
  "စီမံကိန်း",
  "အလုပ်",
];

export async function transcribeAudio(audioBuffer, mimeType, speakersExpected) {
  const blob = new Blob([audioBuffer], { type: mimeType });

  const response = await client.speechToText.convert({
    file: blob,
    modelId: "scribe_v2",
    diarize: true,
    timestampsGranularity: "word",
    keyterms: ZARLA_KEYTERMS,
    ...(speakersExpected ? { numSpeakers: speakersExpected } : {}),
  });

  return mapScribeResponse(response);
}

function mapScribeResponse(response) {
  const segments = [];
  let current = null;

  for (const word of response.words) {
    if (word.type === "spacing") continue;

    if (!current || current.speaker !== word.speakerId) {
      if (current) segments.push(current);
      current = {
        speaker: word.speakerId ?? "speaker_0",
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
    originalSpeaker: seg.speaker,
    speakerOverride: false,
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
