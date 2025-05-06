import { users, type User, type InsertUser, activities, type Activity, type InsertActivity, rescues, type Rescue, type InsertRescue, type DailyActivity, type Stats } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

// 定義台灣時區
const TAIWAN_TIMEZONE = "Asia/Taipei";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import * as connectPgModule from "connect-pg-simple";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const connectPg = connectPgModule.default;
const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need
// 定義月度活動記錄類型
export type MonthlyActivity = {
  date: string;
  signInTime: string | null;
  signOutTime: string | null;
  duration: number; // 以小時為單位
};

// 定義救護案件列表項目類型
export type RescueListItem = {
  date: string;
  caseType: string;
  caseSubtype: string | null;
  treatment: string | null;
  id: number;
};

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getUserDailyActivities(userId: number): Promise<DailyActivity>;
  getUserRecentActivities(userId: number): Promise<Activity[]>;
  getUserMonthlyActivities(userId: number): Promise<MonthlyActivity[]>;
  
  // Rescue methods
  createRescue(rescue: InsertRescue): Promise<Rescue>;
  getUserRescuesList(userId: number): Promise<RescueListItem[]>;
  
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
    
    // 使用台灣時區取得今天的日期
    const today = toZonedTime(new Date(), TAIWAN_TIMEZONE);
    const todayStr = formatInTimeZone(today, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    
    // 台灣時區的今天開始和結束時間
    const todayStart = new Date(`${todayStr}T00:00:00+08:00`);
    const todayEnd = new Date(`${todayStr}T23:59:59+08:00`);
    
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
      signInTime: signInActivity ? formatInTimeZone(new Date(signInActivity.timestamp), TAIWAN_TIMEZONE, "HH:mm") : null,
      signOutTime: signOutActivity ? formatInTimeZone(new Date(signOutActivity.timestamp), TAIWAN_TIMEZONE, "HH:mm") : null,
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
  
  // 獲取用戶月度活動記錄
  async getUserMonthlyActivities(userId: number): Promise<MonthlyActivity[]> {
    // 檢查是否為測試帳號
    const user = await this.getUser(userId);
    if (user && user.username === "test") {
      // 測試帳號回傳空的活動記錄
      return [];
    }
    
    // 獲取本月的開始和結束日期
    const now = toZonedTime(new Date(), TAIWAN_TIMEZONE);
    const firstDayOfMonthZoned = startOfMonth(now);
    const lastDayOfMonthZoned = endOfMonth(now);
    
    // 需要將台灣時區的日期轉換為 UTC 以連結數據庫
    const firstDayStr = formatInTimeZone(firstDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const lastDayStr = formatInTimeZone(lastDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const firstDayOfMonth = new Date(`${firstDayStr}T00:00:00+08:00`);
    const lastDayOfMonth = new Date(`${lastDayStr}T23:59:59+08:00`);
    
    // 獲取用戶本月所有活動
    const userActivities = await db.select()
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          gte(activities.timestamp, firstDayOfMonth),
          lte(activities.timestamp, lastDayOfMonth)
        )
      )
      .orderBy(activities.timestamp);
    
    // 按日期分組活動
    const activitiesByDay = new Map<string, { 
      date: string, 
      signIn?: Date, 
      signInStr?: string, 
      signOut?: Date, 
      signOutStr?: string, 
      duration: number 
    }>();
    
    // 處理每一個活動記錄
    userActivities.forEach(activity => {
      const date = formatInTimeZone(new Date(activity.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd");
      const entry = activitiesByDay.get(date) || { date, duration: 0 };
      
      if (activity.type === "signin") {
        entry.signIn = new Date(activity.timestamp);
        entry.signInStr = formatInTimeZone(entry.signIn, TAIWAN_TIMEZONE, "HH:mm");
      } else if (activity.type === "signout") {
        entry.signOut = new Date(activity.timestamp);
        entry.signOutStr = formatInTimeZone(entry.signOut, TAIWAN_TIMEZONE, "HH:mm");
      }
      
      // 計算時長
      if (entry.signIn && entry.signOut) {
        // 確保時間差為正數，使用 Math.abs 取絕對值
        const timeDiff = Math.abs(entry.signOut.getTime() - entry.signIn.getTime());
        const hours = timeDiff / (1000 * 60 * 60);
        
        // 排除異常的時間差 (大於24小時或小於0的情況)
        if (hours > 0 && hours <= 24) {
          entry.duration = Math.round(hours * 10) / 10; // 四捨五入到小數點後一位
        }
      }
      
      activitiesByDay.set(date, entry);
    });
    
    // 轉換為陣列並格式化為API響應格式
    const monthlyActivities: MonthlyActivity[] = Array.from(activitiesByDay.values())
      .map(entry => ({
        date: entry.date,
        signInTime: entry.signInStr || null,
        signOutTime: entry.signOutStr || null,
        duration: entry.duration || 0
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 依照日期排序，最新的在前
    
    return monthlyActivities;
  }
  
  // 獲取用戶的救護案件列表
  async getUserRescuesList(userId: number): Promise<RescueListItem[]> {
    // 檢查是否為測試帳號
    const user = await this.getUser(userId);
    if (user && user.username === "test") {
      // 測試帳號回傳空的救護記錄
      return [];
    }
    
    // 獲取本月的開始和結束日期
    const now = toZonedTime(new Date(), TAIWAN_TIMEZONE);
    const firstDayOfMonthZoned = startOfMonth(now);
    const lastDayOfMonthZoned = endOfMonth(now);
    
    // 需要將台灣時區的日期轉換為 UTC 以連結數據庫
    const firstDayStr = formatInTimeZone(firstDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const lastDayStr = formatInTimeZone(lastDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const firstDayOfMonth = new Date(`${firstDayStr}T00:00:00+08:00`);
    const lastDayOfMonth = new Date(`${lastDayStr}T23:59:59+08:00`);
    
    // 獲取用戶本月所有救護案件
    const userRescues = await db.select()
      .from(rescues)
      .where(
        and(
          eq(rescues.userId, userId),
          gte(rescues.timestamp, firstDayOfMonth),
          lte(rescues.timestamp, lastDayOfMonth)
        )
      )
      .orderBy(desc(rescues.timestamp)); // 最新的在前
    
    // 將救護案件轉換為列表項目格式
    const rescueList: RescueListItem[] = userRescues.map(rescue => ({
      date: formatInTimeZone(new Date(rescue.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd"),
      caseType: rescue.caseType,
      caseSubtype: rescue.caseSubtype,
      treatment: rescue.treatment,
      id: rescue.id
    }));
    
    return rescueList;
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
    
    // 使用台灣時區取得本月的開始和結束日期
    const now = toZonedTime(new Date(), TAIWAN_TIMEZONE);
    const firstDayOfMonthZoned = startOfMonth(now);
    const lastDayOfMonthZoned = endOfMonth(now);
    
    // 需要將台灣時區的日期轉換為 UTC 以連結數據庫
    const firstDayStr = formatInTimeZone(firstDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const lastDayStr = formatInTimeZone(lastDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const firstDayOfMonth = new Date(`${firstDayStr}T00:00:00+08:00`);
    const lastDayOfMonth = new Date(`${lastDayStr}T23:59:59+08:00`);
    
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
      // 使用台灣時區格式化日期
      const day = formatInTimeZone(new Date(activity.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd");
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
        // 確保時間差為正數，使用 Math.abs 取絕對值
        const timeDiff = Math.abs(signOut.getTime() - signIn.getTime());
        const hours = timeDiff / (1000 * 60 * 60);
        
        // 排除異常的時間差 (大於24小時或小於0的情況)
        if (hours > 0 && hours <= 24) {
          workHours += hours;
        }
      }
    });
    
    // Round to 1 decimal place and ensure it's not negative
    workHours = Math.max(0, Math.round(workHours * 10) / 10);
    
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
