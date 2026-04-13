import { Router } from "express";
import { db } from "@workspace/db";
import { toolsTable, logsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateToolBody, UpdateToolBody } from "@workspace/api-zod";

const OWNER_ID = "owner";
const router = Router();

router.get("/tools", async (_req, res) => {
  const tools = await db.select().from(toolsTable).where(eq(toolsTable.userId, OWNER_ID)).orderBy(desc(toolsTable.createdAt));
  const logs = await db.select().from(logsTable).where(and(eq(logsTable.userId, OWNER_ID), eq(logsTable.itemType, "tool")));

  const result = tools.map(tool => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    url: tool.url,
    status: tool.status,
    createdWith: tool.createdWith,
    createdByAccount: tool.createdByAccount,
    deployWith: tool.deployWith,
    deployByAccount: tool.deployByAccount,
    version: tool.version,
    releaseDate: tool.releaseDate,
    createdAt: tool.createdAt.toISOString(),
    logs: logs
      .filter(l => l.itemId === tool.id)
      .sort((a, b) => b.id - a.id)
      .map(l => ({ id: l.id, text: l.text, date: l.date, completed: l.completed })),
  }));

  return res.json(result);
});

router.post("/tools", async (req, res) => {
  const parsed = CreateToolBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const body = parsed.data;
  const [tool] = await db.insert(toolsTable).values({
    userId: OWNER_ID,
    name: body.name,
    description: body.description ?? "",
    url: body.url ?? "",
    status: body.status ?? "Pending",
    createdWith: body.createdWith ?? "",
    createdByAccount: body.createdByAccount ?? "",
    deployWith: body.deployWith ?? "",
    deployByAccount: body.deployByAccount ?? "",
    version: body.version ?? "",
    releaseDate: body.releaseDate ?? "",
  }).returning();

  return res.status(201).json({ ...tool, createdAt: tool.createdAt.toISOString(), logs: [] });
});

router.patch("/tools/:toolId", async (req, res) => {
  const toolId = parseInt(req.params.toolId);

  const parsed = UpdateToolBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const body = parsed.data;
  const [updated] = await db.update(toolsTable).set({
    name: body.name,
    description: body.description ?? "",
    url: body.url ?? "",
    status: body.status ?? "Pending",
    createdWith: body.createdWith ?? "",
    createdByAccount: body.createdByAccount ?? "",
    deployWith: body.deployWith ?? "",
    deployByAccount: body.deployByAccount ?? "",
    version: body.version ?? "",
    releaseDate: body.releaseDate ?? "",
  }).where(and(eq(toolsTable.id, toolId), eq(toolsTable.userId, OWNER_ID))).returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  const logs = await db.select().from(logsTable).where(and(eq(logsTable.userId, OWNER_ID), eq(logsTable.itemId, toolId), eq(logsTable.itemType, "tool")));
  return res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    logs: logs.sort((a, b) => b.id - a.id).map(l => ({ id: l.id, text: l.text, date: l.date, completed: l.completed })),
  });
});

router.delete("/tools/:toolId", async (req, res) => {
  const toolId = parseInt(req.params.toolId);
  await db.delete(logsTable).where(and(eq(logsTable.userId, OWNER_ID), eq(logsTable.itemId, toolId), eq(logsTable.itemType, "tool")));
  await db.delete(toolsTable).where(and(eq(toolsTable.id, toolId), eq(toolsTable.userId, OWNER_ID)));
  return res.status(204).send();
});

router.post("/tools/:toolId/logs", async (req, res) => {
  const toolId = parseInt(req.params.toolId);
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text required" });

  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const [log] = await db.insert(logsTable).values({ userId: OWNER_ID, itemId: toolId, itemType: "tool", text, date, completed: false }).returning();
  return res.status(201).json({ id: log.id, text: log.text, date: log.date, completed: log.completed });
});

router.post("/tools/:toolId/convert", async (req, res) => {
  const planningId = parseInt(req.params.toolId);
  const { planningsTable } = await import("@workspace/db");

  const [plan] = await db.select().from(planningsTable).where(and(eq(planningsTable.id, planningId), eq(planningsTable.userId, OWNER_ID)));
  if (!plan) return res.status(404).json({ error: "Not found" });

  const [newTool] = await db.insert(toolsTable).values({
    userId: OWNER_ID,
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

  const planLogs = await db.select().from(logsTable).where(and(eq(logsTable.userId, OWNER_ID), eq(logsTable.itemId, planningId), eq(logsTable.itemType, "planning")));
  for (const log of planLogs) {
    await db.insert(logsTable).values({ userId: OWNER_ID, itemId: newTool.id, itemType: "tool", text: log.text, date: log.date, completed: log.completed });
  }

  await db.delete(logsTable).where(and(eq(logsTable.userId, OWNER_ID), eq(logsTable.itemId, planningId), eq(logsTable.itemType, "planning")));
  await db.delete(planningsTable).where(and(eq(planningsTable.id, planningId), eq(planningsTable.userId, OWNER_ID)));

  const toolLogs = await db.select().from(logsTable).where(and(eq(logsTable.userId, OWNER_ID), eq(logsTable.itemId, newTool.id), eq(logsTable.itemType, "tool")));
  return res.status(201).json({ ...newTool, createdAt: newTool.createdAt.toISOString(), logs: toolLogs.map(l => ({ id: l.id, text: l.text, date: l.date, completed: l.completed })) });
});

export default router;
