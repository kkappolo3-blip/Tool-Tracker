import { Router } from "express";
import { db } from "@workspace/db";
import { logsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.patch("/logs/:logId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;
  const logId = parseInt(req.params.logId);

  const { text, completed } = req.body;
  const updateData: Partial<{ text: string; completed: boolean }> = {};
  if (text !== null && text !== undefined) updateData.text = text;
  if (completed !== null && completed !== undefined) updateData.completed = completed;

  const [updated] = await db.update(logsTable).set(updateData).where(and(eq(logsTable.id, logId), eq(logsTable.userId, userId))).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({ id: updated.id, text: updated.text, date: updated.date, completed: updated.completed });
});

router.delete("/logs/:logId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;
  const logId = parseInt(req.params.logId);

  await db.delete(logsTable).where(and(eq(logsTable.id, logId), eq(logsTable.userId, userId)));
  return res.status(204).send();
});

export default router;
