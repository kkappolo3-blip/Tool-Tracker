import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolsTable = pgTable("tools", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  url: text("url").notNull().default(""),
  status: text("status").notNull().default("Pending"),
  createdWith: text("created_with").notNull().default(""),
  createdByAccount: text("created_by_account").notNull().default(""),
  deployWith: text("deploy_with").notNull().default(""),
  deployByAccount: text("deploy_by_account").notNull().default(""),
  version: text("version").notNull().default(""),
  releaseDate: text("release_date").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const planningsTable = pgTable("plannings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  url: text("url").notNull().default(""),
  category: text("category").notNull().default("Ide"),
  price: text("price").notNull().default(""),
  target: text("target").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemId: integer("item_id").notNull(),
  itemType: text("item_type").notNull(), // 'tool' | 'planning'
  text: text("text").notNull(),
  date: text("date").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
});

export const insertToolSchema = createInsertSchema(toolsTable).omit({ id: true, createdAt: true });
export const insertPlanningSchema = createInsertSchema(planningsTable).omit({ id: true, createdAt: true });
export const insertLogSchema = createInsertSchema(logsTable).omit({ id: true, createdAt: true });
export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true });

export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
export type InsertPlanning = z.infer<typeof insertPlanningSchema>;
export type Planning = typeof planningsTable.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type LogItem = typeof logsTable.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
