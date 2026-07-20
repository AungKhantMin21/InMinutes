import { Router } from "express";
import { v4 as uuid } from "uuid";
import { prisma } from "../lib/db.js";
import { meetingQueue } from "../lib/queue.js";
import { getUploadUrl } from "../lib/r2.js";

const router = Router();

router.post("/presign", async (req, res) => {
  try {
    const { filename, contentType, title } = req.body;

    if (!filename || !contentType || !title) {
      return res.status(400).json({ error: "filename, contentType, and title are required" });
    }

    const ext = filename.split(".").pop();
    const audioKey = `meetings/${uuid()}.${ext}`;

    const meeting = await prisma.meeting.create({
      data: { title, audioKey, status: "uploading" },
    });

    const uploadUrl = await getUploadUrl(audioKey, contentType);

    res.json({ data: { meetingId: meeting.id, uploadUrl, audioKey } });
  } catch (err) {
    res.status(500).json({ error: "Failed to create upload URL" });
  }
});

router.post("/confirm/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { id: true, audioKey: true, title: true },
    });

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    await prisma.meeting.update({
      where: { id },
      data: { status: "transcribing" },
    });

    await meetingQueue.add("process", {
      meetingId: meeting.id,
      audioKey: meeting.audioKey,
      title: meeting.title,
    });

    res.json({ data: { status: "queued" } });
  } catch (err) {
    res.status(500).json({ error: "Failed to queue meeting for processing" });
  }
});

export default router;
