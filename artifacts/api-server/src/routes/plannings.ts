import { Router } from "express";
import { db } from "@workspace/db";
import { planningsTable, logsTable, toolsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreatePlanningBody, UpdatePlanningBody } from "@workspace/api-zod";

const router = Router();

router.get("/plannings", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;

  const plannings = await db.select().from(planningsTable).where(eq(planningsTable.userId, userId)).orderBy(desc(planningsTable.createdAt));
  const logs = await db.select().from(logsTable).where(and(eq(logsTable.userId, userId), eq(logsTable.itemType, "planning")));

  const result = plannings.map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    url: plan.url,
    category: plan.category,
    price: plan.price,
    target: plan.target,
    createdAt: plan.createdAt.toISOString(),
    logs: logs
      .filter(l => l.itemId === plan.id)
      .sort((a, b) => b.id - a.id)
      .map(l => ({ id: l.id, text: l.text, date: l.date, completed: l.completed })),
  }));

  return res.json(result);
});

router.post("/plannings", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;

  const parsed = CreatePlanningBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const body = parsed.data;
  const [plan] = await db.insert(planningsTable).values({
    userId,
    name: body.name,
    description: body.description ?? "",
    url: body.url ?? "",
    category: body.category ?? "Ide",
    price: body.price ?? "",
    target: body.target ?? "",
  }).returning();

  return res.status(201).json({ ...plan, createdAt: plan.createdAt.toISOString(), logs: [] });
});

router.patch("/plannings/:planningId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;
  const planningId = parseInt(req.params.planningId);

  const parsed = UpdatePlanningBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const body = parsed.data;
  const [updated] = await db.update(planningsTable).set({
    name: body.name,
    description: body.description ?? "",
    url: body.url ?? "",
    category: body.category ?? "Ide",
    price: body.price ?? "",
    target: body.target ?? "",
  }).where(and(eq(planningsTable.id, planningId), eq(planningsTable.userId, userId))).returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  const logs = await db.select().from(logsTable).where(and(eq(logsTable.userId, userId), eq(logsTable.itemId, planningId), eq(logsTable.itemType, "planning")));
  return res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    logs: logs.sort((a, b) => b.id - a.id).map(l => ({ id: l.id, text: l.text, date: l.date, completed: l.completed })),
  });
});

router.delete("/plannings/:planningId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;
  const planningId = parseInt(req.params.planningId);

  await db.delete(logsTable).where(and(eq(logsTable.userId, userId), eq(logsTable.itemId, planningId), eq(logsTable.itemType, "planning")));
  await db.delete(planningsTable).where(and(eq(planningsTable.id, planningId), eq(planningsTable.userId, userId)));
  return res.status(204).send();
});

router.post("/plannings/:planningId/logs", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;
  const planningId = parseInt(req.params.planningId);

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text required" });

  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const [log] = await db.insert(logsTable).values({ userId, itemId: planningId, itemType: "planning", text, date, completed: false }).returning();
  return res.status(201).json({ id: log.id, text: log.text, date: log.date, completed: log.completed });
});

router.post("/plannings/:planningId/convert", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user!.id;
  const planningId = parseInt(req.params.planningId);

  const [plan] = await db.select().from(planningsTable).where(and(eq(planningsTable.id, planningId), eq(planningsTable.userId, userId)));
  if (!plan) return res.status(404).json({ error: "Not found" });

  const [newTool] = await db.insert(toolsTable).values({
    userId,
    name: plan.name,
    description: plan.description,
    url: plan.url,
    status: "Pending",
    createdWith: "",
    createdByAccount: "",
    deployWith: "",
    deployByAccount: "",
    version: "",
    releaseDate: "",
  }).returning();

  const planLogs = await db.select().from(logsTable).where(and(eq(logsTable.userId, userId), eq(logsTable.itemId, planningId), eq(logsTable.itemType, "planning")));
  for (const log of planLogs) {
    await db.insert(logsTable).values({ userId, itemId: newTool.id, itemType: "tool", text: log.text, date: log.date, completed: log.completed });
  }

  await db.delete(logsTable).where(and(eq(logsTable.userId, userId), eq(logsTable.itemId, planningId), eq(logsTable.itemType, "planning")));
  await db.delete(planningsTable).where(and(eq(planningsTable.id, planningId), eq(planningsTable.userId, userId)));

  const toolLogs = await db.select().from(logsTable).where(and(eq(logsTable.userId, userId), eq(logsTable.itemId, newTool.id), eq(logsTable.itemType, "tool")));
  return res.status(201).json({ ...newTool, createdAt: newTool.createdAt.toISOString(), logs: toolLogs.map(l => ({ id: l.id, text: l.text, date: l.date, completed: l.completed })) });
});

export default router;
