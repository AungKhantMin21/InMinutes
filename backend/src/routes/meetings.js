import { Router } from "express";
import { prisma } from "../lib/db.js";
import { meetingQueue } from "../lib/queue.js";
import { getDownloadUrl } from "../lib/r2.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const where = req.employee.role === "admin" ? {} : { employeeId: req.employee.employeeId };
    const meetings = await prisma.meeting.findMany({
      where,
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
        attendees: true,
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
      select: {
        keyPoints: true,
        actionItems: true,
        meetingMinutes: true,
        minutesPreparedBy: true,
        datePrepared: true,
      },
    });

    if (!output) {
      return res.status(404).json({ error: "Output not found" });
    }

    res.json({ data: output });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch output" });
  }
});

router.get("/:id/audio-url", async (req, res) => {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      select: { audioKey: true, audioContentType: true },
    });

    if (!meeting || !meeting.audioKey) {
      return res.status(404).json({ error: "Audio not found" });
    }

    const url = await getDownloadUrl(meeting.audioKey, 7200);
    const contentType = meeting.audioContentType ?? "audio/mpeg";

    res.json({ data: { url, contentType } });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate audio URL" });
  }
});

router.post("/:id/review/confirm-transcript", async (req, res) => {
  const { speakerMap, diarizedSegments: editedSegments } = req.body;

  try {
    let baseSegments = editedSegments;

    if (!baseSegments) {
      const transcript = await prisma.transcript.findUnique({
        where: { meetingId: req.params.id },
        select: { diarizedSegments: true },
      });
      if (!transcript) {
        return res.status(404).json({ error: "Transcript not found" });
      }
      baseSegments = transcript.diarizedSegments;
    }

    const mappedSegments = baseSegments.map((seg) => {
      if (seg.speakerOverride) return seg;
      const renamed = speakerMap?.[seg.originalSpeaker ?? seg.speaker];
      return { ...seg, speaker: renamed ?? seg.speaker };
    });

    await prisma.transcript.update({
      where: { meetingId: req.params.id },
      data: { diarizedSegments: mappedSegments },
    });

    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      select: { title: true },
    });

    await prisma.meeting.update({
      where: { id: req.params.id },
      data: { status: "analyzing" },
    });

    await meetingQueue.add("analyze", { meetingId: req.params.id, title: meeting.title });

    res.json({ data: { status: "analyzing" } });
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm transcript" });
  }
});

router.post("/:id/review/confirm", async (req, res) => {
  const { speakerMap, meetingMinutes, actionItems, attendees, minutesPreparedBy, datePrepared } = req.body;

  try {
    const transcript = await prisma.transcript.findUnique({
      where: { meetingId: req.params.id },
      select: { diarizedSegments: true },
    });

    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    const mappedSegments = transcript.diarizedSegments.map((seg) => ({
      ...seg,
      speaker: (speakerMap && speakerMap[seg.speaker]) || seg.speaker,
    }));

    const mappedMinutes = Object.entries(speakerMap ?? {}).reduce(
      (text, [original, replacement]) =>
        replacement ? text.replaceAll(original, replacement) : text,
      meetingMinutes
    );

    const mappedActionItems = actionItems.map((item) => ({
      ...item,
      owner: (speakerMap && speakerMap[item.owner]) || item.owner,
    }));

    await prisma.transcript.update({
      where: { meetingId: req.params.id },
      data: { diarizedSegments: mappedSegments },
    });

    await prisma.output.update({
      where: { meetingId: req.params.id },
      data: {
        meetingMinutes: mappedMinutes,
        actionItems: mappedActionItems,
        minutesPreparedBy: minutesPreparedBy ?? null,
        datePrepared: datePrepared ?? null,
      },
    });

    // Resolve attendees — create Person records for manual entries
    const resolvedAttendees = [];
    for (const attendee of (attendees ?? [])) {
      if (attendee.personId) {
        resolvedAttendees.push(attendee);
      } else {
        const person = await prisma.person.create({
          data: { canonicalName: attendee.name, aliases: [attendee.name] },
        });
        resolvedAttendees.push({ personId: person.id, name: attendee.name });
      }
    }

    await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        status: "done",
        completedAt: new Date(),
        attendees: resolvedAttendees,
      },
    });

    for (const [speakerLabel, realName] of Object.entries(speakerMap ?? {})) {
      if (!realName) continue;

      let person = await prisma.person.findFirst({
        where: {
          OR: [
            { canonicalName: { equals: realName, mode: "insensitive" } },
            { aliases: { has: realName } },
          ],
        },
      });

      if (!person) {
        person = await prisma.person.create({
          data: { canonicalName: realName, aliases: [realName] },
        });
      } else if (!person.aliases.includes(realName)) {
        await prisma.person.update({
          where: { id: person.id },
          data: { aliases: { push: realName } },
        });
      }

      await prisma.meetingParticipant.upsert({
        where: { meetingId_speakerLabel: { meetingId: req.params.id, speakerLabel } },
        create: { meetingId: req.params.id, personId: person.id, speakerLabel },
        update: { personId: person.id },
      });
    }

    res.json({ data: { status: "done" } });
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm review" });
  }
});

router.post("/:id/review/discard", async (req, res) => {
  try {
    await prisma.meeting.update({
      where: { id: req.params.id },
      data: { status: "discarded" },
    });
    res.json({ data: { status: "discarded" } });
  } catch (err) {
    res.status(500).json({ error: "Failed to discard meeting" });
  }
});

export default router;
