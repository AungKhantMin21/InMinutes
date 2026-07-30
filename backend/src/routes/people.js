import { Router } from "express";
import { prisma } from "../lib/db.js";

const router = Router();

router.get("/employees", async (req, res) => {
  const q = (req.query.q ?? "").trim();
  if (!q) return res.json({ data: [] });

  try {
    const employees = await prisma.employee.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, jobTitle: true, personId: true },
      take: 8,
    });
    res.json({ data: employees });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/persons", async (req, res) => {
  const q = (req.query.q ?? "").trim();
  if (!q) return res.json({ data: [] });

  try {
    const persons = await prisma.person.findMany({
      where: {
        canonicalName: { contains: q, mode: "insensitive" },
      },
      select: { id: true, canonicalName: true, jobTitle: true, email: true },
      take: 8,
    });
    res.json({ data: persons });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
