import { users, volunteers, type User, type InsertUser, type Volunteer, type InsertVolunteer, activities, type Activity, type InsertActivity, rescues, type Rescue, type InsertRescue, type DailyActivity, type Stats } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

// 定義台灣時區
const TAIWAN_TIMEZONE = "Asia/Taipei";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, or } from "drizzle-orm";
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
  isTimeError?: boolean; // 標記時間順序錯誤
  activityId?: number; // 可用於識別特定記錄
  activityType?: string; // 活動類型 (signin/signout/pair)
};

// 定義救護案件列表項目類型
export type RescueListItem = {
  date: string;
  time: string; // 時間欄位
  caseType: string;
  caseSubtype: string | null;
  treatment: string | null;
  hospital: string | null; // 送達醫院欄位
  rescueType: string | null; // ALS, BLS, PUA救護類別
  startTime: string | null; // 出勤時間
  endTime: string | null; // 返隊時間
  id: number;
};

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Volunteer management methods
  getVolunteers(): Promise<Volunteer[]>;
  getVolunteer(id: number): Promise<Volunteer | undefined>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;
  updateVolunteer(id: number, volunteer: Partial<InsertVolunteer>): Promise<Volunteer>;
  deleteVolunteer(id: number): Promise<void>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getUserDailyActivities(userId: number): Promise<DailyActivity>;
  getUserRecentActivities(userId: number): Promise<Activity[]>;
  getUserMonthlyActivities(userId: number): Promise<MonthlyActivity[]>;
  getAllUsersMonthlyActivities(): Promise<(MonthlyActivity & { userId: number, userName: string })[]>;
  
  // Rescue methods
  createRescue(rescue: InsertRescue): Promise<Rescue>;
  getUserRescuesList(userId: number): Promise<RescueListItem[]>;
  getAllUsersRescuesList(): Promise<(RescueListItem & { userId: number, userName: string })[]>;
  
  // Stats methods
  getUserStats(userId: number): Promise<Stats>;
  getAllUsersStats(): Promise<(Stats & { userId: number, userName: string })[]>;
  
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
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
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
    
    // 台灣時區的今天開始和結束時間使用數據庫能識別的UTC格式
    // 為了確保時區轉換正確，我們使用date-fns-tz的功能
    const startOfDayZoned = startOfDay(today);
    const endOfDayZoned = endOfDay(today);
    
    // 轉換為全球UTC時間，以符合數據庫存儲格式
    const todayStart = new Date(startOfDayZoned);
    const todayEnd = new Date(endOfDayZoned);
    
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
    
    // 按照時間戳排序，這樣我們可以獲取最新的記錄
    const sortedActivities = [...userTodayActivities].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // 找到最新的簽到和簽退記錄
    const latestSignIn = sortedActivities.find(a => a.type === "signin");
    const latestSignOut = sortedActivities.find(a => a.type === "signout");
    
    return {
      signInTime: latestSignIn ? formatInTimeZone(new Date(latestSignIn.timestamp), TAIWAN_TIMEZONE, "HH:mm") : null,
      signOutTime: latestSignOut ? formatInTimeZone(new Date(latestSignOut.timestamp), TAIWAN_TIMEZONE, "HH:mm") : null,
      signOutIP: latestSignOut ? latestSignOut.ip : null,
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
          lte(activities.timestamp, lastDayOfMonth),
          or(
            eq(activities.type, "signin"),
            eq(activities.type, "signout")
          )
        )
      )
      .orderBy(desc(activities.timestamp)); // 最新的在前
    
    // 創建日期到簽到/簽退記錄的映射
    const dateToActivities = new Map<string, Activity[]>();
    
    // 按日期分組活動
    for (const activity of userActivities) {
      const date = formatInTimeZone(new Date(activity.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd");
      if (!dateToActivities.has(date)) {
        dateToActivities.set(date, []);
      }
      dateToActivities.get(date)?.push(activity);
    }
    
    // 創建結果陣列
    const monthlyActivities: MonthlyActivity[] = [];
    
    // 按日期處理所有簽到和簽退記錄
    Array.from(dateToActivities.entries()).forEach(([date, activitiesForDate]) => {
      // 分離簽到和簽退記錄
      const signIns = activitiesForDate.filter((a: Activity) => a.type === "signin");
      const signOuts = activitiesForDate.filter((a: Activity) => a.type === "signout");
      
      // 如果有簽到和簽退記錄，創建匯配對
      if (signIns.length > 0 && signOuts.length > 0) {
        // 使用最新的簽到和簽退記錄創建主記錄
        const latestSignIn = signIns[0]; // 已按時間降序排序，所以第一個就是最新的
        const latestSignOut = signOuts[0];
        
        const signInTime = formatInTimeZone(new Date(latestSignIn.timestamp), TAIWAN_TIMEZONE, "HH:mm");
        const signOutTime = formatInTimeZone(new Date(latestSignOut.timestamp), TAIWAN_TIMEZONE, "HH:mm");
        
        // 計算時長
        const signInDate = new Date(latestSignIn.timestamp);
        const signOutDate = new Date(latestSignOut.timestamp);
        const timeDiff = Math.abs(signOutDate.getTime() - signInDate.getTime());
        const hours = timeDiff / (1000 * 60 * 60);
        let duration = 0;
        
        // 排除異常的時間差
        if (hours > 0 && hours <= 24) {
          duration = Math.round(hours * 10) / 10; // 四捨五入到小數點後一位
        }
        
        // 檢查簽到時間是否晚於簽退時間
        const isTimeError = signInDate.getTime() > signOutDate.getTime();
        
        // 添加匯配對主記錄
        monthlyActivities.push({
          date,
          signInTime,
          signOutTime,
          duration,
          isTimeError,
          activityId: latestSignIn.id,
          activityType: "pair" // 標記為簽到和簽退的配對
        });
        
        // 另外添加所有其他簽到記錄 (除了最新的)
        for (let i = 1; i < signIns.length; i++) {
          const otherSignIn = signIns[i];
          monthlyActivities.push({
            date,
            signInTime: formatInTimeZone(new Date(otherSignIn.timestamp), TAIWAN_TIMEZONE, "HH:mm"),
            signOutTime: null,
            duration: 0,
            activityId: otherSignIn.id,
            activityType: "signin"
          });
        }
        
        // 另外添加所有其他簽退記錄 (除了最新的)
        for (let i = 1; i < signOuts.length; i++) {
          const otherSignOut = signOuts[i];
          monthlyActivities.push({
            date,
            signInTime: null,
            signOutTime: formatInTimeZone(new Date(otherSignOut.timestamp), TAIWAN_TIMEZONE, "HH:mm"),
            duration: 0,
            activityId: otherSignOut.id,
            activityType: "signout"
          });
        }
      } else {
        // 只有簽到記錄
        for (const signIn of signIns) {
          monthlyActivities.push({
            date,
            signInTime: formatInTimeZone(new Date(signIn.timestamp), TAIWAN_TIMEZONE, "HH:mm"),
            signOutTime: null,
            duration: 0,
            activityId: signIn.id,
            activityType: "signin"
          });
        }
        
        // 只有簽退記錄
        for (const signOut of signOuts) {
          monthlyActivities.push({
            date,
            signInTime: null,
            signOutTime: formatInTimeZone(new Date(signOut.timestamp), TAIWAN_TIMEZONE, "HH:mm"),
            duration: 0,
            activityId: signOut.id,
            activityType: "signout"
          });
        }
      }
    });
    
    // 先按日期排序，然後按活動類型排序。這樣簽到簽退對就會在最上面。
    monthlyActivities.sort((a: MonthlyActivity, b: MonthlyActivity) => {
      // 先按日期倖序排序，最新的在前
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // 另外讓配對的記錄位於最前面
      if (a.activityType === "pair" && b.activityType !== "pair") return -1;
      if (a.activityType !== "pair" && b.activityType === "pair") return 1;
      
      return 0;
    });
    
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
      time: formatInTimeZone(new Date(rescue.timestamp), TAIWAN_TIMEZONE, "HH:mm"), // 使用24小時制
      caseType: rescue.caseType,
      caseSubtype: rescue.caseSubtype,
      treatment: rescue.treatment,
      hospital: rescue.hospital,
      rescueType: rescue.rescueType,
      startTime: rescue.startTime,
      endTime: rescue.endTime,
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
          hospital: insertRescue.hospital || null,
          rescueType: insertRescue.rescueType || null,
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
      hospital: insertRescue.hospital || null,
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
  
  // Volunteer 方法實現
  async getVolunteers(): Promise<Volunteer[]> {
    return await db.select().from(volunteers).orderBy(volunteers.name);
  }
  
  async getVolunteer(id: number): Promise<Volunteer | undefined> {
    const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.id, id));
    return volunteer || undefined;
  }
  
  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    const [volunteer] = await db
      .insert(volunteers)
      .values(insertVolunteer)
      .returning();
    return volunteer;
  }
  
  async updateVolunteer(id: number, updateData: Partial<InsertVolunteer>): Promise<Volunteer> {
    const [volunteer] = await db
      .update(volunteers)
      .set(updateData)
      .where(eq(volunteers.id, id))
      .returning();
    return volunteer;
  }
  
  async deleteVolunteer(id: number): Promise<void> {
    // 先獲取志工資料，以取得可能的用戶名
    const volunteer = await this.getVolunteer(id);
    if (volunteer && volunteer.username) {
      // 如果該志工已註冊（有用戶名），則也刪除對應的用戶記錄
      // 首先查找是否有對應的用戶記錄
      const user = await this.getUserByUsername(volunteer.username);
      if (user) {
        // 刪除用戶記錄
        await db.delete(users).where(eq(users.username, volunteer.username));
      }
    }
    
    // 然後刪除志工記錄
    await db.delete(volunteers).where(eq(volunteers.id, id));
  }
  
  // Stats methods
  async getUserStats(userId: number): Promise<Stats> {
    // 檢查是否為測試帳號
    const user = await this.getUser(userId);
    if (user && user.username === "test") {
      // 測試帳號則回傳固定的預設統計數據
      return {
        workHours: 0,
        rescueCount: 0,
        trainingCount: 0,
        dutyCount: 0
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
    
    // 按日期分組活動
    const activitiesByDate = userActivities.reduce((acc, activity) => {
      const date = formatInTimeZone(new Date(activity.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd");
      if (!acc[date]) acc[date] = [];
      acc[date].push(activity);
      return acc;
    }, {} as Record<string, Activity[]>);
    
    // Group activities by day with latest sign in/out time
    const activitiesByDay = new Map<string, { signIn?: Date, signOut?: Date }>();
    
    Object.entries(activitiesByDate).forEach(([date, dailyActivities]) => {
      // 依照時間戳排序，以便取得最新的記錄
      const sortedActivities = [...dailyActivities].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // 找到最新的簽到和簽退記錄
      const latestSignIn = sortedActivities.find(a => a.type === "signin");
      const latestSignOut = sortedActivities.find(a => a.type === "signout");
      
      const entry = { } as { signIn?: Date, signOut?: Date };
      
      if (latestSignIn) {
        entry.signIn = new Date(latestSignIn.timestamp);
      }
      
      if (latestSignOut) {
        entry.signOut = new Date(latestSignOut.timestamp);
      }
      
      activitiesByDay.set(date, entry);
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
    
    // 計算常訓記錄數量
    const trainingCount = userActivities.filter(activity => activity.type === "training").length;
    
    // 計算公差記錄數量
    const dutyCount = userActivities.filter(activity => activity.type === "duty").length;
    
    return {
      workHours,
      rescueCount,
      trainingCount,
      dutyCount
    };
  }
  // 獲取所有用戶的月度活動記錄
  async getAllUsersMonthlyActivities(): Promise<(MonthlyActivity & { userId: number, userName: string })[]> {
    // 獲取本月的開始和結束日期
    const now = toZonedTime(new Date(), TAIWAN_TIMEZONE);
    const firstDayOfMonthZoned = startOfMonth(now);
    const lastDayOfMonthZoned = endOfMonth(now);
    
    // 需要將台灣時區的日期轉換為 UTC 以連結數據庫
    const firstDayStr = formatInTimeZone(firstDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const lastDayStr = formatInTimeZone(lastDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const firstDayOfMonth = new Date(`${firstDayStr}T00:00:00+08:00`);
    const lastDayOfMonth = new Date(`${lastDayStr}T23:59:59+08:00`);
    
    // 獲取所有用戶
    const allUsers = await this.getAllUsers();
    
    // 存儲所有用戶的結果
    const result: (MonthlyActivity & { userId: number, userName: string })[] = [];
    
    // 處理每個用戶的活動記錄
    for (const user of allUsers) {
      if (user.username === "test") continue; // 跳過測試帳號
      
      const userActivities = await this.getUserMonthlyActivities(user.id);
      
      // 添加用戶ID和名稱
      for (const activity of userActivities) {
        result.push({
          ...activity,
          userId: user.id,
          userName: user.name
        });
      }
    }
    
    return result;
  }
  
  // 獲取所有用戶的救護案件列表
  async getAllUsersRescuesList(): Promise<(RescueListItem & { userId: number, userName: string })[]> {
    // 獲取本月的開始和結束日期
    const now = toZonedTime(new Date(), TAIWAN_TIMEZONE);
    const firstDayOfMonthZoned = startOfMonth(now);
    const lastDayOfMonthZoned = endOfMonth(now);
    
    // 需要將台灣時區的日期轉換為 UTC 以連結數據庫
    const firstDayStr = formatInTimeZone(firstDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const lastDayStr = formatInTimeZone(lastDayOfMonthZoned, TAIWAN_TIMEZONE, "yyyy-MM-dd");
    const firstDayOfMonth = new Date(`${firstDayStr}T00:00:00+08:00`);
    const lastDayOfMonth = new Date(`${lastDayStr}T23:59:59+08:00`);
    
    // 獲取所有救護記錄與用戶信息
    const allRescues = await db.query.rescues.findMany({
      with: {
        user: true
      },
      where: and(
        gte(rescues.timestamp, firstDayOfMonth),
        lte(rescues.timestamp, lastDayOfMonth)
      ),
      orderBy: desc(rescues.timestamp)
    });
    
    // 轉換為結果格式
    const result: (RescueListItem & { userId: number, userName: string })[] = allRescues.map(rescue => ({
      date: formatInTimeZone(new Date(rescue.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd"),
      time: formatInTimeZone(new Date(rescue.timestamp), TAIWAN_TIMEZONE, "HH:mm"),
      caseType: rescue.caseType,
      caseSubtype: rescue.caseSubtype,
      treatment: rescue.treatment,
      hospital: rescue.hospital,
      rescueType: rescue.rescueType,
      startTime: rescue.startTime,
      endTime: rescue.endTime,
      id: rescue.id,
      userId: rescue.userId,
      userName: rescue.user.name
    }));
    
    return result;
  }
  
  // 獲取所有用戶的統計數據
  async getAllUsersStats(): Promise<(Stats & { userId: number, userName: string })[]> {
    // 獲取所有用戶
    const allUsers = await this.getAllUsers();
    
    // 存儲所有用戶的結果
    const result: (Stats & { userId: number, userName: string })[] = [];
    
    // 處理每個用戶的統計數據
    for (const user of allUsers) {
      if (user.username === "test") continue; // 跳過測試帳號
      
      const userStats = await this.getUserStats(user.id);
      
      // 添加用戶ID和名稱
      result.push({
        ...userStats,
        userId: user.id,
        userName: user.name
      });
    }
    
    return result;
  }
}

export const storage = new DatabaseStorage();
