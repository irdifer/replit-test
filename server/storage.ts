import { users, type User, type InsertUser, activities, type Activity, type InsertActivity, rescues, type Rescue, type InsertRescue, type DailyActivity, type Stats } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import * as connectPgModule from "connect-pg-simple";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const connectPg = connectPgModule.default;
const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getUserDailyActivities(userId: number): Promise<DailyActivity>;
  getUserRecentActivities(userId: number): Promise<Activity[]>;
  
  // Rescue methods
  createRescue(rescue: InsertRescue): Promise<Rescue>;
  
  // Stats methods
  getUserStats(userId: number): Promise<Stats>;
  
  // Session store
  sessionStore: any; // session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure all required fields have values, even if null
    const values = {
      ...insertUser,
      role: insertUser.role || "volunteer",
    };
    
    const [user] = await db
      .insert(users)
      .values(values)
      .returning();
    return user;
  }
  
  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    // 先檢查是否是測試帳號
    if (insertActivity.userId) {
      const user = await this.getUser(insertActivity.userId);
      if (user && user.username === "test") {
        // 測試帳號的活動不寫入數據庫，只回傳模擬的活動資料
        return {
          id: -1, // 無存在的ID
          userId: insertActivity.userId,
          type: insertActivity.type,
          timestamp: new Date(),
          ip: insertActivity.ip || null,
        };
      }
    }
    
    // 如果不是測試帳號，則正常記錄活動
    const values = {
      ...insertActivity,
      ip: insertActivity.ip || null,
    };
    
    const [activity] = await db
      .insert(activities)
      .values(values)
      .returning();
    return activity;
  }
  
  async getUserDailyActivities(userId: number): Promise<DailyActivity> {
    // 檢查是否為測試帳號
    const user = await this.getUser(userId);
    if (user && user.username === "test") {
      // 測試帳號回傳空白的活動記錄
      return {
        signInTime: null,
        signOutTime: null,
        signOutIP: null
      };
    }
    
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const todayStart = new Date(`${todayStr}T00:00:00`);
    const todayEnd = new Date(`${todayStr}T23:59:59`);
    
    // Get today's activities for this user
    const userTodayActivities = await db.select()
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          gte(activities.timestamp, todayStart),
          lte(activities.timestamp, todayEnd)
        )
      );
    
    // Find sign in and sign out times
    const signInActivity = userTodayActivities.find(a => a.type === "signin");
    const signOutActivity = userTodayActivities.find(a => a.type === "signout");
    
    return {
      signInTime: signInActivity ? format(new Date(signInActivity.timestamp), "HH:mm") : null,
      signOutTime: signOutActivity ? format(new Date(signOutActivity.timestamp), "HH:mm") : null,
      signOutIP: signOutActivity ? signOutActivity.ip : null,
    };
  }
  
  async getUserRecentActivities(userId: number): Promise<Activity[]> {
    // 檢查是否為測試帳號
    const user = await this.getUser(userId);
    if (user && user.username === "test") {
      // 測試帳號回傳空的活動歷史
      return [];
    }
    
    // Get the user's activities
    const userActivities = await db.select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.timestamp))
      .limit(10);
    
    // Get the user's rescues
    const userRescues = await db.select()
      .from(rescues)
      .where(eq(rescues.userId, userId))
      .orderBy(desc(rescues.timestamp))
      .limit(5);
    
    // Convert rescues to activities for display
    const rescueActivities = userRescues.map(rescue => {
      return {
        id: rescue.id + 1000, // Ensure no ID collision with regular activities
        userId: rescue.userId,
        type: "rescue",
        timestamp: rescue.timestamp,
        ip: "", // Not applicable for rescues
      } as Activity;
    });
    
    // Combine and sort all activities
    const combinedActivities = [...userActivities, ...rescueActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    return combinedActivities;
  }
  
  // Rescue methods
  async createRescue(insertRescue: InsertRescue): Promise<Rescue> {
    // 檢查是否為測試帳號
    if (insertRescue.userId) {
      const user = await this.getUser(insertRescue.userId);
      if (user && user.username === "test") {
        // 測試帳號的救護記錄不寫入數據庫，只回傳模擬的救護資料
        return {
          id: -1, // 無存在的ID
          userId: insertRescue.userId,
          caseType: insertRescue.caseType,
          caseSubtype: insertRescue.caseSubtype || null,
          treatment: insertRescue.treatment || null,
          startTime: insertRescue.startTime || null,
          endTime: insertRescue.endTime || null,
          woundLength: insertRescue.woundLength || null,
          woundHeight: insertRescue.woundHeight || null,
          woundDepth: insertRescue.woundDepth || null,
          timestamp: new Date(),
        };
      }
    }
    
    // 如果不是測試帳號，則正常記錄救護記錄
    const values = {
      ...insertRescue,
      caseSubtype: insertRescue.caseSubtype || null,
      treatment: insertRescue.treatment || null,
      startTime: insertRescue.startTime || null,
      endTime: insertRescue.endTime || null,
      woundLength: insertRescue.woundLength || null,
      woundHeight: insertRescue.woundHeight || null,
      woundDepth: insertRescue.woundDepth || null,
    };
    
    const [rescue] = await db
      .insert(rescues)
      .values(values)
      .returning();
    return rescue;
  }
  
  // Stats methods
  async getUserStats(userId: number): Promise<Stats> {
    // 檢查是否為測試帳號
    const user = await this.getUser(userId);
    if (user && user.username === "test") {
      // 測試帳號則回傳固定的預設統計數據
      return {
        workHours: 0,
        rescueCount: 0
      };
    }
    
    const now = new Date();
    const firstDayOfMonth = startOfMonth(now);
    const lastDayOfMonth = endOfMonth(now);
    
    // Get user activities for this month
    const userActivities = await db.select()
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          gte(activities.timestamp, firstDayOfMonth),
          lte(activities.timestamp, lastDayOfMonth)
        )
      );
    
    // Calculate work hours
    let workHours = 0;
    
    // Group activities by day
    const activitiesByDay = new Map<string, { signIn?: Date, signOut?: Date }>();
    
    userActivities.forEach(activity => {
      const day = format(new Date(activity.timestamp), "yyyy-MM-dd");
      const entry = activitiesByDay.get(day) || {};
      
      if (activity.type === "signin") {
        entry.signIn = new Date(activity.timestamp);
      } else if (activity.type === "signout") {
        entry.signOut = new Date(activity.timestamp);
      }
      
      activitiesByDay.set(day, entry);
    });
    
    // Calculate hours for each day
    activitiesByDay.forEach(({ signIn, signOut }) => {
      if (signIn && signOut) {
        const hours = (signOut.getTime() - signIn.getTime()) / (1000 * 60 * 60);
        workHours += hours;
      }
    });
    
    // Round to 1 decimal place
    workHours = Math.round(workHours * 10) / 10;
    
    // Count rescue cases
    const rescueCount = await db.select({ count: sql`count(*)` })
      .from(rescues)
      .where(
        and(
          eq(rescues.userId, userId),
          gte(rescues.timestamp, firstDayOfMonth),
          lte(rescues.timestamp, lastDayOfMonth)
        )
      )
      .then(result => Number(result[0]?.count || 0));
    
    return {
      workHours,
      rescueCount,
    };
  }
}

export const storage = new DatabaseStorage();
