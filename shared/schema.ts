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

// 新增管理名單表格
export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").default("志工"), // 身分
  isAdmin: boolean("is_admin").default(false), // 是否有管理權限
  isRegistered: boolean("is_registered").default(false), // 是否已成功註冊
  username: text("username").unique(), // 可能的用戶名
  notes: text("notes"), // 備註
  teamType: text("team_type").default("T1"), // 隊員類型: T1, T2, TP
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVolunteerSchema = createInsertSchema(volunteers).pick({
  name: true,
  position: true,
  isAdmin: true,
  isRegistered: true,
  username: true,
  notes: true,
  teamType: true,
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
  rescueType: text("rescue_type"), // ALS, BLS, PUA
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
  rescueType: true, // ALS, BLS, PUA
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

export type Volunteer = typeof volunteers.$inferSelect;
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;

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

export type MonthlyActivity = {
  date: string;
  signInTime: string | null;
  signOutTime: string | null;
  duration: number;
  isTimeError?: boolean; // 標記時間順序錯誤
  activityId?: number; // 可用於識別特定記錄
  activityType?: string; // 活動類型 (signin/signout)
};

export type Stats = {
  workHours: number;
  rescueCount: number;
  trainingCount: number; // 常訓記錄數量
  dutyCount: number;    // 公差記錄數量
};
