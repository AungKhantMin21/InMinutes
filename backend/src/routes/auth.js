import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

function signToken(employee) {
  return jwt.sign(
    { employeeId: employee.id, email: employee.email, role: employee.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const { name, email, password, jobTitle } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  try {
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const person = await prisma.person.create({
      data: {
        canonicalName: name,
        aliases: [name],
        email,
        jobTitle: jobTitle || null,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        passwordHash,
        jobTitle: jobTitle || null,
        personId: person.id,
      },
    });

    const token = signToken(employee);
    res.json({
      data: {
        token,
        employee: { id: employee.id, name: employee.name, email: employee.email, role: employee.role },
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed. Try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(employee);
    res.json({
      data: {
        token,
        employee: { id: employee.id, name: employee.name, email: employee.email, role: employee.role },
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed. Try again." });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.employee.employeeId },
      select: { id: true, name: true, email: true, role: true, jobTitle: true },
    });

    if (!employee) {
      return res.status(404).json({ error: "Account not found." });
    }

    res.json({ data: { employee } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch account." });
  }
});

export default router;
