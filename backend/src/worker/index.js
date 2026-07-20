import "dotenv/config";
import { Worker } from "bullmq";
import { redis } from "../lib/queue.js";
import { prisma } from "../lib/db.js";

const worker = new Worker(
  "meeting-processing",
  async (job) => {
    const { meetingId } = job.data;
    console.log(`Job received — meetingId: ${meetingId}`);

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "done", completedAt: new Date() },
    });

    console.log(`Job complete (stub) — meetingId: ${meetingId}`);
  },
  { connection: redis }
);

worker.on("failed", async (job, err) => {
  console.error(`Job failed — meetingId: ${job.data.meetingId}`, err.message);
  await prisma.meeting.update({
    where: { id: job.data.meetingId },
    data: { status: "failed", errorMsg: err.message },
  });
});

console.log("Worker started — listening for jobs");
