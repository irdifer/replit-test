import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").default("volunteer"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "signin", "signout", "training", "duty"
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ip: text("ip"),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  type: true,
  ip: true,
});

export const rescues = pgTable("rescues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  caseType: text("case_type").notNull(),
  caseSubtype: text("case_subtype"),
  treatment: text("treatment"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertRescueSchema = createInsertSchema(rescues).pick({
  userId: true,
  caseType: true,
  caseSubtype: true,
  treatment: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Rescue = typeof rescues.$inferSelect;
export type InsertRescue = z.infer<typeof insertRescueSchema>;

// Helper types for frontend
export type DailyActivity = {
  signInTime: string | null;
  signOutTime: string | null;
  signOutIP: string | null;
};

export type Stats = {
  workHours: number;
  rescueCount: number;
};
