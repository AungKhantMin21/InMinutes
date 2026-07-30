import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/db.js";
import { redis } from "./lib/queue.js";
import { authenticate } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import uploadRouter from "./routes/upload.js";
import meetingsRouter from "./routes/meetings.js";
import peopleRouter from "./routes/people.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/upload", authenticate, uploadRouter);
app.use("/api/meetings", authenticate, meetingsRouter);
app.use("/api/people", authenticate, peopleRouter);

app.get("/api/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

async function start() {
  const meetingCount = await prisma.meeting.count();
  console.log(`Prisma connected — meetings in DB: ${meetingCount}`);

  await redis.ping();
  console.log("Redis connected");

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
