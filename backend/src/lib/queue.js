import { Queue } from "bullmq";
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const meetingQueue = new Queue("meeting-processing", {
  connection: redis,
});
