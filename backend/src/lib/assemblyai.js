import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export async function transcribeWithDiarization(audioUrl) {
  const transcript = await client.transcripts.transcribe({
    audio_url: audioUrl,
    speaker_labels: true,
    speakers_expected: 4,
    language_detection: true,
  });

  if (transcript.status === "error") {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  // AssemblyAI language_detection only gives a single code for the whole transcript,
  // not per-utterance. Detect Burmese per-segment from Myanmar Unicode script range
  // (U+1000–U+109F) which is unambiguous — Latin characters always resolve to "en".
  function detectLang(text) {
    if (/[က-႟]/.test(text)) return "my";
    return "en";
  }

  const segments = (transcript.utterances ?? []).map((u) => ({
    speaker: "Speaker " + u.speaker,
    text: u.text,
    originalLang: detectLang(u.text),
    translatedText: null,
    start: u.start,
    end: u.end,
  }));

  return { rawText: transcript.text, segments };
}
