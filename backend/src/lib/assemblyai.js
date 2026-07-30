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

  const detectedLang = transcript.language_code ?? "en";

  const segments = (transcript.utterances ?? []).map((u) => ({
    speaker: "Speaker " + u.speaker,
    text: u.text,
    originalLang: u.language ?? detectedLang,
    translatedText: null,
    start: u.start,
    end: u.end,
  }));

  return { rawText: transcript.text, segments };
}
