import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { activities } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Get daily activities for current user
  app.get("/api/activities/daily", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const todayActivities = await storage.getUserDailyActivities(userId);
    return res.json(todayActivities);
  });

  // Get recent activities for current user
  app.get("/api/activities/recent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const recentActivities = await storage.getUserRecentActivities(userId);
    return res.json(recentActivities);
  });

  // Create a new activity
  app.post("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const { type } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "";
    
    // 如果是簽到，需要清除之前的簽退記錄
    if (type === "signin") {
      // 使用台灣時區取得今天的日期
      const today = toZonedTime(new Date(), "Asia/Taipei");
      const todayStr = formatInTimeZone(today, "Asia/Taipei", "yyyy-MM-dd");
      
      // 台灣時區的今天開始和結束時間
      const todayStart = new Date(`${todayStr}T00:00:00+08:00`);
      const todayEnd = new Date(`${todayStr}T23:59:59+08:00`);
      
      // 刪除今天的所有簽退記錄
      try {
        await db.delete(activities)
          .where(
            and(
              eq(activities.userId, userId),
              eq(activities.type, "signout"),
              gte(activities.timestamp, todayStart),
              lte(activities.timestamp, todayEnd)
            )
          );
      } catch (error) {
        console.error("清除簽退記錄時出錯:", error);
        // 即使清除失敗，我們仍然繼續創建新的簽到記錄
      }
    }

    // 創建新活動記錄
    const activity = await storage.createActivity({
      userId,
      type,
      ip,
    });

    return res.status(201).json(activity);
  });

  // Get monthly activities for current user
  app.get("/api/activities/monthly", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const isAdmin = req.user!.role === "admin";
    const showAll = req.query.all === "true" && isAdmin;
    
    if (showAll) {
      // Admin query with all=true parameter - return all users' data
      const allUsersMonthlyActivities = await storage.getAllUsersMonthlyActivities();
      return res.json(allUsersMonthlyActivities);
    } else {
      // Return current user's data only
      const monthlyActivities = await storage.getUserMonthlyActivities(userId);
      return res.json(monthlyActivities);
    }
  });

  // Get rescue list for current user
  app.get("/api/rescues/list", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const isAdmin = req.user!.role === "admin";
    const showAll = req.query.all === "true" && isAdmin;
    
    if (showAll) {
      // Admin query with all=true parameter - return all users' data
      const allUsersRescuesList = await storage.getAllUsersRescuesList();
      return res.json(allUsersRescuesList);
    } else {
      // Return current user's data only
      const rescueList = await storage.getUserRescuesList(userId);
      return res.json(rescueList);
    }
  });

  // Get stats for current user
  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const isAdmin = req.user!.role === "admin";
    const showAll = req.query.all === "true" && isAdmin;
    
    if (showAll) {
      // Admin query with all=true parameter - return all users' data
      const allUsersStats = await storage.getAllUsersStats();
      return res.json(allUsersStats);
    } else {
      // Return current user's data only
      const stats = await storage.getUserStats(userId);
      return res.json(stats);
    }
  });

  // Create a new rescue record
  app.post("/api/rescues", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const { caseType, caseSubtype, treatment, hospital, rescueType, startTime, endTime, woundLength, woundHeight, woundDepth } = req.body;

    if (!caseType) {
      return res.status(400).json({ message: "Case type is required" });
    }
    
    // 記錄請求資料，便於除錯
    console.log("Creating rescue with data:", { rescueType, caseType, caseSubtype, hospital });

    const rescue = await storage.createRescue({
      userId,
      caseType,
      caseSubtype,
      treatment,
      hospital,
      rescueType,  // 添加救護類別
      startTime,
      endTime,
      woundLength,
      woundHeight,
      woundDepth,
    });

    return res.status(201).json(rescue);
  });
  
  // Volunteer management routes (admin only)
  // Get all volunteers
  app.get("/api/volunteers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") return res.sendStatus(403);
    
    const volunteers = await storage.getVolunteers();
    return res.json(volunteers);
  });
  
  // Get a specific volunteer
  app.get("/api/volunteers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") return res.sendStatus(403);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid volunteer ID" });
    }
    
    const volunteer = await storage.getVolunteer(id);
    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }
    
    return res.json(volunteer);
  });
  
  // Create a new volunteer
  app.post("/api/volunteers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") return res.sendStatus(403);
    
    const { name, position, isAdmin, username, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    
    try {
      // 首先檢查志工表中是否已存在相同名稱的志工
      const existingVolunteers = await storage.getVolunteers();
      const nameExists = existingVolunteers.some(v => v.name === name);
      if (nameExists) {
        return res.status(400).json({ message: "Volunteer name already exists" });
      }
      
      // 如果指定了用戶名，檢查用戶表中是否已存在
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      // 檢查用戶表中是否有同名的用戶
      const allUsers = await storage.getAllUsers();
      const userWithSameName = allUsers.find(user => user.name === name);
      
      // 如果有同名用戶且沒有指定用戶名，則退出
      if (userWithSameName && !username) {
        return res.status(400).json({ message: "User with same name already exists. Please specify a username." });
      }
      
      const volunteer = await storage.createVolunteer({
        name,
        position: position || "志工",
        isAdmin: isAdmin || false,
        isRegistered: false, // 新建的志工預設尚未註冊
        username,
        notes
      });
      
      return res.status(201).json(volunteer);
    } catch (error) {
      console.error("Creating volunteer error:", error);
      return res.status(500).json({ message: "An error occurred" });
    }
  });
  
  // Update a volunteer
  app.patch("/api/volunteers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") return res.sendStatus(403);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid volunteer ID" });
    }
    
    const { name, position, isAdmin, isRegistered, username, notes } = req.body;
    
    try {
      // 檢查當前的志工資料
      const currentVolunteer = await storage.getVolunteer(id);
      if (!currentVolunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }
      
      // 如果要修改名稱，檢查是否已存在
      if (name && name !== currentVolunteer.name) {
        const existingVolunteers = await storage.getVolunteers();
        const nameExists = existingVolunteers.some(v => v.name === name && v.id !== id);
        if (nameExists) {
          return res.status(400).json({ message: "Volunteer name already exists" });
        }
      }
      
      // 如果要修改用戶名，檢查是否已存在
      if (username && username !== currentVolunteer.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      // 如果要修改名稱，檢查用戶表中是否有同名的用戶
      if (name && name !== currentVolunteer.name) {
        const allUsers = await storage.getAllUsers();
        const userWithSameName = allUsers.find(user => user.name === name);
        
        // 如果有同名用戶且沒有指定用戶名，則退出
        if (userWithSameName && !username) {
          return res.status(400).json({ message: "User with same name already exists. Please specify a username." });
        }
      }
      
      const volunteer = await storage.updateVolunteer(id, {
        ...(name && { name }),
        ...(position && { position }),
        ...(isAdmin !== undefined && { isAdmin }),
        ...(isRegistered !== undefined && { isRegistered }),
        ...(username && { username }),
        ...(notes !== undefined && { notes })
      });
      
      return res.json(volunteer);
    } catch (error) {
      console.error("Updating volunteer error:", error);
      return res.status(500).json({ message: "An error occurred" });
    }
  });
  
  // Delete a volunteer
  app.delete("/api/volunteers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") return res.sendStatus(403);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid volunteer ID" });
    }
    
    await storage.deleteVolunteer(id);
    return res.sendStatus(204);
  });

  const httpServer = createServer(app);

  return httpServer;
}
