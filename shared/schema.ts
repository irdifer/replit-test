import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  hospital: text("hospital"), // 新增送達醫院欄位
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  // Mission times
  startTime: text("start_time"),
  endTime: text("end_time"),
  // Wound dimensions for laceration injuries
  woundLength: text("wound_length"),
  woundHeight: text("wound_height"),
  woundDepth: text("wound_depth"),
});

export const insertRescueSchema = createInsertSchema(rescues).pick({
  userId: true,
  caseType: true,
  caseSubtype: true,
  treatment: true,
  hospital: true, // 新增送達醫院欄位
  startTime: true,
  endTime: true,
  woundLength: true,
  woundHeight: true,
  woundDepth: true,
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  activities: many(activities),
  rescues: many(rescues),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const rescuesRelations = relations(rescues, ({ one }) => ({
  user: one(users, {
    fields: [rescues.userId],
    references: [users.id],
  }),
}));

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
