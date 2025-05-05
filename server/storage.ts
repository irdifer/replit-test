import { users, type User, type InsertUser, activities, type Activity, type InsertActivity, rescues, type Rescue, type InsertRescue, type DailyActivity, type Stats } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { format, startOfMonth, endOfMonth } from "date-fns";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private activities: Map<number, Activity>;
  private rescues: Map<number, Rescue>;
  sessionStore: session.SessionStore;
  
  userCurrentId: number;
  activityCurrentId: number;
  rescueCurrentId: number;

  constructor() {
    this.users = new Map();
    this.activities = new Map();
    this.rescues = new Map();
    
    this.userCurrentId = 1;
    this.activityCurrentId = 1;
    this.rescueCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const timestamp = new Date();
    const activity: Activity = { ...insertActivity, id, timestamp };
    this.activities.set(id, activity);
    return activity;
  }
  
  async getUserDailyActivities(userId: number): Promise<DailyActivity> {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    
    // Filter today's activities for this user
    const userTodayActivities = Array.from(this.activities.values()).filter(
      (activity) => 
        activity.userId === userId && 
        format(new Date(activity.timestamp), "yyyy-MM-dd") === todayStr
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
    // Filter activities for this user and sort by timestamp (newest first)
    const userActivities = Array.from(this.activities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Get only the 10 most recent activities
    
    // Get the user's rescues and convert them to activities for display
    const userRescues = Array.from(this.rescues.values())
      .filter(rescue => rescue.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5) // Get only the 5 most recent rescues
      .map(rescue => {
        return {
          id: rescue.id + 1000, // Ensure no ID collision with regular activities
          userId: rescue.userId,
          type: "rescue",
          timestamp: rescue.timestamp,
          ip: "", // Not applicable for rescues
        } as Activity;
      });
    
    // Combine and sort all activities
    const combinedActivities = [...userActivities, ...userRescues]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    return combinedActivities;
  }
  
  // Rescue methods
  async createRescue(insertRescue: InsertRescue): Promise<Rescue> {
    const id = this.rescueCurrentId++;
    const timestamp = new Date();
    const rescue: Rescue = { ...insertRescue, id, timestamp };
    this.rescues.set(id, rescue);
    return rescue;
  }
  
  // Stats methods
  async getUserStats(userId: number): Promise<Stats> {
    const now = new Date();
    const firstDayOfMonth = startOfMonth(now);
    const lastDayOfMonth = endOfMonth(now);
    
    // Calculate work hours
    let workHours = 0;
    const userActivities = Array.from(this.activities.values())
      .filter(activity => 
        activity.userId === userId && 
        new Date(activity.timestamp) >= firstDayOfMonth &&
        new Date(activity.timestamp) <= lastDayOfMonth
      );
    
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
    const rescueCount = Array.from(this.rescues.values()).filter(
      rescue => 
        rescue.userId === userId && 
        new Date(rescue.timestamp) >= firstDayOfMonth &&
        new Date(rescue.timestamp) <= lastDayOfMonth
    ).length;
    
    return {
      workHours,
      rescueCount,
    };
  }
}

export const storage = new MemStorage();
