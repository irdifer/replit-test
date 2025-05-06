import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// 允許註冊的志工名單，以及管理員標記
const ALLOWED_VOLUNTEERS = [
  { name: "楊宗銘", isAdmin: false },
  { name: "蔡萬達", isAdmin: false },
  { name: "林居逸", isAdmin: false },
  { name: "呂泓鈞", isAdmin: false },
  { name: "林思廷", isAdmin: false },
  { name: "林承志", isAdmin: false },
  { name: "許毓庭", isAdmin: true },  // 管理員
  { name: "林漢忠", isAdmin: false },
  { name: "黃璽諭", isAdmin: false },
  { name: "林士閎", isAdmin: false },
  { name: "吳佩姍", isAdmin: false },
  { name: "洪雅婕", isAdmin: false },
  { name: "吳盈學", isAdmin: false },
  { name: "古易軒", isAdmin: false },
  { name: "邱俊雄", isAdmin: false },
  { name: "王伶瑜", isAdmin: false },
  { name: "黃紫涵", isAdmin: false },
  { name: "朱麗鳳", isAdmin: false },
  { name: "郭秀琴", isAdmin: false },
  { name: "温世同", isAdmin: false },
  { name: "蔡湘禾", isAdmin: false },
  { name: "朱昶達", isAdmin: true },  // 管理員
];

// 特殊測試帳號，不記錄活動
const TEST_ACCOUNTS = [
  {
    username: "test",
    password: "test",
    name: "測試帳號",
    role: "volunteer"
  },
  {
    username: "3bug",
    password: "123456",
    name: "3bug帳號",
    role: "volunteer"
  }
];

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "volunteer-management-system-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // 檢查並創建測試帳號
  (async () => {
    try {
      // 創建所有測試帳號
      for (const account of TEST_ACCOUNTS) {
        const testUser = await storage.getUserByUsername(account.username);
        if (!testUser) {
          // 如果測試帳號不存在，創建它
          await storage.createUser({
            ...account,
            password: await hashPassword(account.password),
          });
          console.log(`測試帳號 ${account.username} 已創建`);
        }
      }
    } catch (error) {
      console.error("創建測試帳號時出錯:", error);
    }
  })();

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("用戶名已被使用");
    }

    // 如果是測試帳號名稱，不允許註冊
    if (TEST_ACCOUNTS.some(account => account.username === req.body.username)) {
      return res.status(400).send("不能使用保留的用戶名");
    }

    // 檢查名字是否在允許的志工名單中
    const allowedVolunteer = ALLOWED_VOLUNTEERS.find(v => v.name === req.body.name);
    if (!allowedVolunteer) {
      return res.status(400).send("抱歉，您的姓名不在允許的志工名單中");
    }

    // 設置正確的角色（志工或管理員）
    const role = allowedVolunteer.isAdmin ? "admin" : "volunteer";

    const user = await storage.createUser({
      ...req.body,
      role, // 使用從名單中確定的角色
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
