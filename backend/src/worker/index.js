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

async function processJob(job) {
  const { meetingId, audioKey, title } = job.data;
  console.log(`Processing job — meetingId: ${meetingId}`);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "transcribing" },
  });

  const audioUrl = await getDownloadUrl(audioKey);
  console.log(`Transcribing — meetingId: ${meetingId}`);

  const { rawText, segments } = await transcribeWithDiarization(audioUrl);

  await prisma.transcript.create({
    data: { meetingId, rawText, diarizedSegments: segments },
  });

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "analyzing" },
  });

  const formatted = formatTranscript(segments);
  console.log(`Analyzing — meetingId: ${meetingId}`);

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
    data: { status: "done", completedAt: new Date() },
  });

  console.log(`Done — meetingId: ${meetingId}`);
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
