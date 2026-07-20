import { Router } from "express";
import { prisma } from "../lib/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        source: true,
        createdAt: true,
        completedAt: true,
      },
    });
    res.json({ data: meetings });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        status: true,
        source: true,
        errorMsg: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({ data: meeting });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

router.get("/:id/transcript", async (req, res) => {
  try {
    const transcript = await prisma.transcript.findUnique({
      where: { meetingId: req.params.id },
      select: { rawText: true, diarizedSegments: true },
    });

    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    res.json({ data: transcript });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
});

router.get("/:id/output", async (req, res) => {
  try {
    const output = await prisma.output.findUnique({
      where: { meetingId: req.params.id },
      select: { keyPoints: true, actionItems: true, meetingMinutes: true },
    });

    if (!output) {
      return res.status(404).json({ error: "Output not found" });
    }

    res.json({ data: output });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch output" });
  }
});

export default router;
