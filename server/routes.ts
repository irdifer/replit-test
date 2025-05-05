import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

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

    const activity = await storage.createActivity({
      userId,
      type,
      ip,
    });

    return res.status(201).json(activity);
  });

  // Get stats for current user
  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const stats = await storage.getUserStats(userId);
    return res.json(stats);
  });

  // Create a new rescue record
  app.post("/api/rescues", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user!.id;
    const { caseType, caseSubtype, treatment } = req.body;

    if (!caseType) {
      return res.status(400).json({ message: "Case type is required" });
    }

    const rescue = await storage.createRescue({
      userId,
      caseType,
      caseSubtype,
      treatment,
    });

    return res.status(201).json(rescue);
  });

  const httpServer = createServer(app);

  return httpServer;
}
