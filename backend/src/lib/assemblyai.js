import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export async function transcribeWithDiarization(audioUrl) {
  const transcript = await client.transcripts.transcribe({
    audio_url: audioUrl,
    speaker_labels: true,
    speakers_expected: 4,
  });

  if (transcript.status === "error") {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  const segments = (transcript.utterances ?? []).map((u) => ({
    speaker: "Speaker " + u.speaker,
    text: u.text,
    start: u.start,
    end: u.end,
  }));

  return { rawText: transcript.text, segments };
}
