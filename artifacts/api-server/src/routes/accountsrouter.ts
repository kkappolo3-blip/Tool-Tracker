import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/accounts", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;

  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, userId));
  return res.json(accounts.map(a => a.email));
});

router.post("/accounts", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const existing = await db.select().from(accountsTable).where(and(eq(accountsTable.userId, userId), eq(accountsTable.email, email)));
  if (existing.length > 0) return res.status(201).json(email);

  await db.insert(accountsTable).values({ userId, email });
  return res.status(201).json(email);
});

export default router;
