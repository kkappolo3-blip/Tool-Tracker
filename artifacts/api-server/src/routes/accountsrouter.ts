import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const OWNER_ID = "owner";
const router = Router();

router.get("/accounts", async (_req, res) => {
  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, OWNER_ID));
  return res.json(accounts.map(a => a.email));
});

router.post("/accounts", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const existing = await db.select().from(accountsTable).where(and(eq(accountsTable.userId, OWNER_ID), eq(accountsTable.email, email)));
  if (existing.length > 0) return res.status(201).json(email);

  await db.insert(accountsTable).values({ userId: OWNER_ID, email });
  return res.status(201).json(email);
});

export default router;
