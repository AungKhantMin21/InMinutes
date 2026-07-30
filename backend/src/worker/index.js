import "dotenv/config";
import { Worker } from "bullmq";
import { redis } from "../lib/queue.js";
import { prisma } from "../lib/db.js";
import { getDownloadUrl } from "../lib/r2.js";
import { transcribeWithDiarization } from "../lib/assemblyai.js";
import {
  formatTranscript,
  extractKeyPoints,
  extractActionItems,
  generateMinutes,
} from "../lib/intelligence.js";

async function runTranscription(job) {
  const { meetingId, audioKey } = job.data;
  console.log(`Transcribing — meetingId: ${meetingId}`);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "transcribing" },
  });

  const audioUrl = await getDownloadUrl(audioKey);
  const { rawText, segments } = await transcribeWithDiarization(audioUrl);

  await prisma.transcript.create({
    data: { meetingId, rawText, diarizedSegments: segments },
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

  const formatted = formatTranscript(transcript.diarizedSegments);

  const [keyPoints, actionItems] = await Promise.all([
    extractKeyPoints(formatted),
    extractActionItems(formatted),
  ]);

  const meetingMinutes = await generateMinutes(formatted, keyPoints, actionItems, title);

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
