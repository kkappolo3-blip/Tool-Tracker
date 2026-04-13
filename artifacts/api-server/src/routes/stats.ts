import { Router } from "express";
import { db } from "@workspace/db";
import { toolsTable, planningsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const OWNER_ID = "owner";
const router = Router();

router.get("/stats", async (_req, res) => {
  const tools = await db.select().from(toolsTable).where(eq(toolsTable.userId, OWNER_ID));
  const plannings = await db.select().from(planningsTable).where(eq(planningsTable.userId, OWNER_ID));

  const totalTools = tools.length;
  const publishedTools = tools.filter(t => t.status === "Publish").length;
  const totalPlannings = plannings.length;
  const potentialRevenue = plannings
    .filter(p => p.category === "Untuk Dijual")
    .reduce((sum, p) => sum + (parseInt(p.price) || 0), 0);

  return res.json({ totalTools, publishedTools, totalPlannings, potentialRevenue });
});

export default router;
