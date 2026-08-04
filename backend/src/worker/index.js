import "dotenv/config";
import { Worker } from "bullmq";
import { redis } from "../lib/queue.js";
import { prisma } from "../lib/db.js";
import { getDownloadUrl } from "../lib/r2.js";
import { transcribeAudio } from "../lib/elevenlabs.js";
import {
  translateNonEnglishSegments,
  buildEnglishTranscript,
  extractKeyPoints,
  extractActionItems,
  generateMinutes,
} from "../lib/intelligence.js";

async function runTranscription(job) {
  const { meetingId, audioKey, audioContentType, speakersExpected } = job.data;
  console.log(`Transcribing — meetingId: ${meetingId}`);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "transcribing" },
  });

  const audioUrl = await getDownloadUrl(audioKey);
  const mimeType = audioContentType ?? "audio/mpeg";

  console.log(`Downloading audio — meetingId: ${meetingId}`);
  const audioRes = await fetch(audioUrl);
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
  console.log(`Audio downloaded (${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB) — sending to Scribe v2`);

  const rawSegments = await transcribeAudio(audioBuffer, mimeType, speakersExpected ?? null);
  console.log(`Scribe v2 done — ${rawSegments.length} segments`);
  const segments = await translateNonEnglishSegments(rawSegments);

  await prisma.transcript.create({
    data: {
      meetingId,
      rawText: segments.map((s) => s.text).join(" "),
      diarizedSegments: segments,
    },
  });

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "transcript_reviewing" },
  });

  console.log(`Transcript ready for review — meetingId: ${meetingId}`);
}

async function runAnalysis(job) {
  const { meetingId, title } = job.data;
  console.log(`Analyzing — meetingId: ${meetingId}`);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "analyzing" },
  });

  const transcript = await prisma.transcript.findUnique({
    where: { meetingId },
    select: { diarizedSegments: true },
  });

  const englishTranscript = buildEnglishTranscript(transcript.diarizedSegments);

  const [keyPoints, actionItems] = await Promise.all([
    extractKeyPoints(englishTranscript),
    extractActionItems(englishTranscript),
  ]);

  const meetingMinutes = await generateMinutes(englishTranscript, keyPoints, actionItems, title);

  await prisma.output.create({
    data: { meetingId, keyPoints, actionItems, meetingMinutes },
  });

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "reviewing" },
  });

  console.log(`Awaiting output review — meetingId: ${meetingId}`);
}

async function processJob(job) {
  if (job.name === "analyze") return runAnalysis(job);
  return runTranscription(job);
}

const worker = new Worker("meeting-processing", processJob, { connection: redis });

worker.on("failed", async (job, err) => {
  console.error(`Job failed — meetingId: ${job.data.meetingId}`, err.message);
  await prisma.meeting.update({
    where: { id: job.data.meetingId },
    data: { status: "failed", errorMsg: err.message },
  });
});

console.log("Worker started — listening for jobs");
