import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./auth";
import {
  chatWithTutor,
  generateTutorial,
  routeIntent,
  synthesizeSpeech,
  transcribeAudio,
} from "./ai";
import {
  conversations as conversationsTable,
  learningProgress as learningProgressTable,
  healthMetrics as healthMetricsTable,
  reminders as remindersTable,
  achievements as achievementsTable,
} from "@shared/schema";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

async function seedForNewUser(userId: string) {
  await Promise.all([
    storage.createReminder({
      userId,
      title: "Take Morning Medication",
      description: "With breakfast",
      type: "medication",
      completed: false,
    }),
    storage.createReminder({
      userId,
      title: "Light Exercise",
      description: "15 min walk or stretching",
      type: "exercise",
      completed: false,
    }),
    storage.createReminder({
      userId,
      title: "Evening Walk",
      description: "30 minutes around the block",
      type: "walk",
      completed: false,
    }),
    storage.createHealthMetrics({
      userId,
      heartRate: 72,
      steps: 5234,
      bloodOxygen: 98,
      sleepQuality: "7.5h",
    }),
    storage.createAchievement({
      userId,
      title: "Welcome to ElderlyConnect",
      description: "Your learning journey starts here",
    }),
    storage.createLearningProgress({
      userId,
      appName: "WhatsApp",
      completed: true,
      completedAt: new Date(),
    }),
  ]);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== AI Tutor endpoint (uses real LLM with offline fallback) =====
  app.post("/api/ai-tutor", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const sanitizedHistory = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter(
              (m: any) =>
                m &&
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string",
            )
            .slice(-12)
            .map((m: any) => ({ role: m.role, content: m.content }))
        : [];
      const response = await chatWithTutor(message, sanitizedHistory);
      res.json({ response });
    } catch (error) {
      console.error("AI Tutor error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  // ===== AI tutorial generator (creates a fresh tutorial on any topic) =====
  app.post("/api/tutorials/generate", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
        return res.status(400).json({ error: "Please provide a topic (at least 2 letters)." });
      }
      const tutorial = await generateTutorial(topic.trim());
      res.json({ tutorial });
    } catch (error) {
      console.error("Tutorial generation error:", error);
      res.status(500).json({ error: "Failed to generate tutorial" });
    }
  });

  // ===== AI tutorials: saved to DB and re-usable =====
  app.post("/api/tutorials/ai", requireAuth, async (req, res) => {
    try {
      const { topic } = req.body || {};
      if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
        return res.status(400).json({ error: "Please provide a topic (at least 2 letters)." });
      }
      const tutorial = await generateTutorial(topic.trim());
      const saved = await storage.createAiTutorial({
        userId: req.session.userId!,
        topic: topic.trim(),
        app: tutorial.app ?? null,
        category: tutorial.category ?? null,
        tags: (tutorial.tags ?? []) as any,
        intro: tutorial.intro,
        steps: tutorial.steps,
        success: tutorial.success,
        quiz: tutorial.quiz,
        source: "ai",
      });
      res.status(201).json({ tutorial: saved });
    } catch (error) {
      console.error("Save AI tutorial error:", error);
      res.status(500).json({ error: "Failed to save AI tutorial" });
    }
  });

  app.get("/api/tutorials/ai", requireAuth, async (req, res) => {
    try {
      const list = await storage.getAiTutorials(req.session.userId!);
      res.json(list);
    } catch (error) {
      console.error("List AI tutorials error:", error);
      res.status(500).json({ error: "Failed to list AI tutorials" });
    }
  });

  app.get("/api/tutorials/ai/:id", requireAuth, async (req, res) => {
    try {
      const t = await storage.getAiTutorial(req.params.id, req.session.userId!);
      if (!t) return res.status(404).json({ error: "Tutorial not found" });
      const progress = await storage.getStepProgress(t.id, req.session.userId!);
      res.json({ tutorial: t, completedSteps: progress.map((p) => p.stepIndex) });
    } catch (error) {
      console.error("Get AI tutorial error:", error);
      res.status(500).json({ error: "Failed to load AI tutorial" });
    }
  });

  app.delete("/api/tutorials/ai/:id", requireAuth, async (req, res) => {
    try {
      const ok = await storage.deleteAiTutorial(req.params.id, req.session.userId!);
      res.json({ success: ok });
    } catch (error) {
      console.error("Delete AI tutorial error:", error);
      res.status(500).json({ error: "Failed to delete AI tutorial" });
    }
  });

  app.post("/api/tutorials/ai/:id/step", requireAuth, async (req, res) => {
    try {
      const { stepIndex } = req.body || {};
      if (!Number.isInteger(stepIndex) || stepIndex < 0) {
        return res.status(400).json({ error: "stepIndex must be a non-negative integer" });
      }
      const tutorial = await storage.getAiTutorial(req.params.id, req.session.userId!);
      if (!tutorial) return res.status(404).json({ error: "Tutorial not found" });
      if (stepIndex >= tutorial.steps.length) {
        return res.status(400).json({ error: "stepIndex out of range" });
      }
      const progress = await storage.markStepComplete(tutorial.id, req.session.userId!, stepIndex);
      res.json({ progress });
    } catch (error) {
      console.error("Mark step error:", error);
      res.status(500).json({ error: "Failed to mark step complete" });
    }
  });

  app.post("/api/tutorials/ai/:id/score", requireAuth, async (req, res) => {
    try {
      const { answers } = req.body || {};
      if (!Array.isArray(answers)) {
        return res.status(400).json({ error: "answers must be an array" });
      }
      const tutorial = await storage.getAiTutorial(req.params.id, req.session.userId!);
      if (!tutorial) return res.status(404).json({ error: "Tutorial not found" });
      const quiz = tutorial.quiz || [];
      let correct = 0;
      quiz.forEach((q, i) => {
        if (typeof answers[i] === "number" && answers[i] === q.correctIndex) correct += 1;
      });
      const total = quiz.length;
      const updated = await storage.updateAiTutorial(tutorial.id, req.session.userId!, {
        score: correct,
        total,
        completedAt: new Date(),
      });
      res.json({ score: correct, total, tutorial: updated });
    } catch (error) {
      console.error("Submit score error:", error);
      res.status(500).json({ error: "Failed to submit score" });
    }
  });

  app.get("/api/tutorials/ai/:id/progress", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getStepProgress(req.params.id, req.session.userId!);
      res.json({ completedSteps: progress.map((p) => p.stepIndex) });
    } catch (error) {
      console.error("Get step progress error:", error);
      res.status(500).json({ error: "Failed to get progress" });
    }
  });

  // ===== Voice command AI (text transcript -> LLM intent router) =====
  app.post("/api/voice/intent", async (req, res) => {
    try {
      const { transcript } = req.body;
      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "transcript is required" });
      }
      const intent = await routeIntent(transcript);
      res.json({ intent });
    } catch (error) {
      console.error("Voice intent error:", error);
      res.status(500).json({ error: "Failed to route intent" });
    }
  });

  // ===== Voice: perform an in-app action server-side (for actions that need DB) =====
  app.post("/api/voice/action", requireAuth, async (req, res) => {
    try {
      const { intent } = req.body || {};
      if (!intent || typeof intent !== "object") {
        return res.status(400).json({ error: "intent object is required" });
      }
      const userId = req.session.userId!;
      switch (intent.intent) {
        case "add_reminder": {
          const text = (intent.params?.text || "Reminder").trim();
          const time = intent.params?.time || null;
          const reminder = await storage.createReminder({
            userId,
            title: text,
            description: time ? `At ${time}` : null,
            type: "other",
            completed: false,
          });
          return res.json({ ok: true, type: "reminder", reminder });
        }
        case "add_medication": {
          const text = (intent.params?.text || "Medicine").trim();
          const time = intent.params?.time || null;
          const reminder = await storage.createReminder({
            userId,
            title: `Take ${text}`,
            description: time ? `At ${time}` : null,
            type: "medication",
            completed: false,
          });
          return res.json({ ok: true, type: "medication", reminder });
        }
        case "add_alarm": {
          const time = intent.params?.time || "08:00";
          const reminder = await storage.createReminder({
            userId,
            title: "Alarm",
            description: `At ${time}`,
            type: "other",
            completed: false,
          });
          return res.json({ ok: true, type: "alarm", time, reminder });
        }
        case "set_timer": {
          const duration = intent.params?.duration || "5m";
          const reminder = await storage.createReminder({
            userId,
            title: `Timer (${duration})`,
            description: `Started by voice at ${new Date().toLocaleTimeString()}`,
            type: "other",
            completed: false,
          });
          return res.json({ ok: true, type: "timer", duration, reminder });
        }
        case "log_water":
        case "add_water": {
          const metrics = await storage.createHealthMetrics({
            userId,
            heartRate: null,
            steps: null,
            bloodOxygen: null,
            sleepQuality: `+1 glass of water at ${new Date().toLocaleTimeString()}`,
          });
          return res.json({ ok: true, type: "water", metrics });
        }
        case "delete_reminder": {
          const list = await storage.getReminders(userId);
          if (list.length === 0) return res.json({ ok: false, reason: "no_reminders" });
          const which = (intent.params?.which || "last").toLowerCase();
          const target =
            which === "last"
              ? list[0]
              : list.find((r) => r.title.toLowerCase().includes(which));
          if (!target) return res.json({ ok: false, reason: "not_found" });
          await db.delete(remindersTable).where(eq(remindersTable.id, target.id));
          return res.json({ ok: true, deleted: target });
        }
        case "mark_step_complete": {
          const tutorials = await storage.getAiTutorials(userId);
          if (tutorials.length === 0) return res.json({ ok: false, reason: "no_tutorial" });
          const t = tutorials[0];
          const existing = await storage.getStepProgress(t.id, userId);
          const completed = new Set(existing.map((p) => p.stepIndex));
          const next = t.steps.findIndex((_s, i) => !completed.has(i));
          if (next < 0) return res.json({ ok: false, reason: "all_done" });
          const progress = await storage.markStepComplete(t.id, userId, next);
          return res.json({ ok: true, type: "step", stepIndex: next, progress, tutorial: t });
        }
        case "read_progress": {
          const tutorials = await storage.getAiTutorials(userId);
          const progress = await Promise.all(
            tutorials.map(async (t) => {
              const steps = await storage.getStepProgress(t.id, userId);
              return {
                id: t.id,
                topic: t.topic,
                stepsDone: steps.length,
                totalSteps: t.steps.length,
                score: t.score,
                total: t.total,
              };
            }),
          );
          return res.json({ ok: true, progress });
        }
        case "read_health":
        case "read_steps":
        case "open_tutorial":
        case "open_dashboard":
        case "open_smartwatch":
        case "open_learning":
        case "open_ai_tutor":
        case "open_privacy":
        case "open_history":
        case "take_quiz":
        case "greet":
        case "help":
        case "stop":
        case "unknown":
          return res.json({ ok: true, type: "client_action", intent: intent.intent });
        default:
          return res.json({ ok: false, reason: "unsupported_intent", intent: intent.intent });
      }
    } catch (error) {
      console.error("Voice action error:", error);
      res.status(500).json({ error: "Failed to perform voice action" });
    }
  });

  // ===== Voice: STT (audio -> text via OpenAI Whisper) =====
  app.post("/api/voice/stt", async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        return res.status(400).json({ error: "Empty audio body" });
      }
      const contentType = (req.headers["content-type"] || "audio/webm").toString();
      const ext = contentType.includes("ogg") ? "audio.ogg" : contentType.includes("mp4") ? "audio.m4a" : "audio.webm";
      const text = await transcribeAudio(buffer, ext);
      if (text == null) {
        return res.status(503).json({ error: "Transcription unavailable (no API key or upstream error)" });
      }
      res.json({ text });
    } catch (error) {
      console.error("STT error:", error);
      res.status(500).json({ error: "Failed to transcribe" });
    }
  });

  // ===== Voice: TTS (text -> mp3 audio via OpenAI TTS) =====
  app.post("/api/voice/tts", async (req, res) => {
    try {
      const { text, voice } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
      }
      const audio = await synthesizeSpeech(text, voice);
      if (!audio) {
        return res.status(503).json({ error: "TTS unavailable (no API key or upstream error)" });
      }
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");
      res.send(audio);
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to synthesize speech" });
    }
  });

  // ===== Paired devices =====
  app.get("/api/devices", requireAuth, async (req, res) => {
    try {
      const list = await storage.getDevices(req.session.userId!);
      res.json(list);
    } catch (error) {
      console.error("Get devices error:", error);
      res.status(500).json({ error: "Failed to load devices" });
    }
  });

  app.post("/api/devices", requireAuth, async (req, res) => {
    try {
      const { deviceId, name, kind, manufacturer, services, metadata } = req.body || {};
      if (!deviceId || !name) {
        return res.status(400).json({ error: "deviceId and name are required" });
      }
      const device = await storage.createDevice({
        userId: req.session.userId!,
        deviceId: String(deviceId),
        name: String(name),
        kind: kind ? String(kind) : "ble-generic",
        manufacturer: manufacturer ? String(manufacturer) : null,
        services: Array.isArray(services) ? services : [],
        metadata: metadata && typeof metadata === "object" ? metadata : {},
      });
      res.status(201).json(device);
    } catch (error) {
      console.error("Create device error:", error);
      res.status(500).json({ error: "Failed to save device" });
    }
  });

  app.delete("/api/devices/:id", requireAuth, async (req, res) => {
    try {
      const ok = await storage.deleteDevice(req.params.id, req.session.userId!);
      res.json({ success: ok });
    } catch (error) {
      console.error("Delete device error:", error);
      res.status(500).json({ error: "Failed to delete device" });
    }
  });

  app.patch("/api/devices/:id/heartbeat", requireAuth, async (req, res) => {
    try {
      const { services, metadata } = req.body || {};
      const device = await storage.updateDevice(req.params.id, req.session.userId!, {
        services: Array.isArray(services) ? services : undefined,
        metadata: metadata && typeof metadata === "object" ? metadata : undefined,
      });
      if (!device) return res.status(404).json({ error: "Device not found" });
      res.json(device);
    } catch (error) {
      console.error("Heartbeat error:", error);
      res.status(500).json({ error: "Failed to update device" });
    }
  });

  // ===== Sync live health metrics from a paired device =====
  app.post("/api/health/sync", requireAuth, async (req, res) => {
    try {
      const { heartRate, steps, bloodOxygen, sleepQuality, deviceId } = req.body || {};
      if (heartRate == null && steps == null && bloodOxygen == null && !sleepQuality) {
        return res.status(400).json({ error: "Provide at least one metric" });
      }
      const metrics = await storage.createHealthMetrics({
        userId: req.session.userId!,
        heartRate: heartRate ?? null,
        steps: steps ?? null,
        bloodOxygen: bloodOxygen ?? null,
        sleepQuality: sleepQuality ?? null,
      });
      if (deviceId) {
        try {
          await storage.updateDevice(deviceId, req.session.userId!, { metadata: { lastSync: new Date().toISOString() } });
        } catch {
          /* ignore */
        }
      }
      res.status(201).json(metrics);
    } catch (error) {
      console.error("Health sync error:", error);
      res.status(500).json({ error: "Failed to sync health metrics" });
    }
  });

  // Seed sample data for the current user (one-click)
  app.post("/api/seed", requireAuth, async (req, res) => {
    try {
      await seedForNewUser(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed" });
    }
  });

  // ===== Auth endpoints =====
  app.post("/api/users/register", async (req, res) => {
    try {
      const { username, password, language, audioEnabled } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      if (typeof username !== "string" || username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already taken" });
      }

      const hashed = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashed,
        language: language || "en",
        audioEnabled: audioEnabled !== false,
      });

      // Seed first-run data so the dashboard is not empty
      await seedForNewUser(user.id);

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to start session" });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/users/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const ok = await verifyPassword(password, user.password);
      if (!ok) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to start session" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("elderlyconnect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(user);
  });

  // ===== Protected: current user profile =====
  app.patch("/api/users/me", requireAuth, async (req, res) => {
    try {
      const { language, audioEnabled } = req.body;
      const user = await storage.updateUser(req.session.userId!, {
        language,
        audioEnabled,
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (req.params.id !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ===== Conversations (uses session.userId) =====
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getAllConversations(req.session.userId!);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { title, topic, messages } = req.body;
      if (!title) return res.status(400).json({ error: "title is required" });

      const conversation = await storage.createConversation({
        userId: req.session.userId!,
        title,
        topic,
        messages: messages || [],
      });
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });
      if (conversation.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getConversation(req.params.id);
      if (!existing) return res.status(404).json({ error: "Conversation not found" });
      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { title, topic, messages } = req.body;
      const conversation = await storage.updateConversation(req.params.id, {
        title,
        topic,
        messages,
      });
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getConversation(req.params.id);
      if (!existing) return res.status(404).json({ error: "Conversation not found" });
      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const deleted = await storage.deleteConversation(req.params.id);
      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // ===== Learning Progress =====
  app.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getLearningProgress(req.session.userId!);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching learning progress:", error);
      res.status(500).json({ error: "Failed to fetch learning progress" });
    }
  });

  app.post("/api/progress", requireAuth, async (req, res) => {
    try {
      const { appName, completed } = req.body;
      if (!appName) return res.status(400).json({ error: "appName is required" });

      const progress = await storage.createLearningProgress({
        userId: req.session.userId!,
        appName,
        completed: completed || false,
      });
      res.status(201).json(progress);
    } catch (error) {
      console.error("Error creating learning progress:", error);
      res.status(500).json({ error: "Failed to create learning progress" });
    }
  });

  app.patch("/api/progress/:id", requireAuth, async (req, res) => {
    try {
      const { completed } = req.body;
      const existing = await db
        .select()
        .from(learningProgressTable)
        .where(eq(learningProgressTable.id, req.params.id));
      if (!existing[0]) return res.status(404).json({ error: "Progress not found" });
      if (existing[0].userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const progress = await storage.updateLearningProgress(req.params.id, {
        completed,
        completedAt: completed ? new Date() : null,
      });
      res.json(progress);
    } catch (error) {
      console.error("Error updating learning progress:", error);
      res.status(500).json({ error: "Failed to update learning progress" });
    }
  });

  // ===== Health Metrics =====
  app.get("/api/health", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getLatestHealthMetrics(req.session.userId!);
      res.json(metrics || null);
    } catch (error) {
      console.error("Error fetching health metrics:", error);
      res.status(500).json({ error: "Failed to fetch health metrics" });
    }
  });

  app.post("/api/health", requireAuth, async (req, res) => {
    try {
      const { heartRate, steps, bloodOxygen, sleepQuality } = req.body;
      const metrics = await storage.createHealthMetrics({
        userId: req.session.userId!,
        heartRate: heartRate ?? null,
        steps: steps ?? null,
        bloodOxygen: bloodOxygen ?? null,
        sleepQuality: sleepQuality ?? null,
      });
      res.status(201).json(metrics);
    } catch (error) {
      console.error("Error creating health metrics:", error);
      res.status(500).json({ error: "Failed to create health metrics" });
    }
  });

  // ===== Reminders =====
  app.get("/api/reminders", requireAuth, async (req, res) => {
    try {
      const reminders = await storage.getReminders(req.session.userId!);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.post("/api/reminders", requireAuth, async (req, res) => {
    try {
      const { title, description, type, completed } = req.body;
      if (!title || !type) return res.status(400).json({ error: "title and type are required" });
      const reminder = await storage.createReminder({
        userId: req.session.userId!,
        title,
        description: description ?? null,
        type,
        completed: completed || false,
      });
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  app.patch("/api/reminders/:id", requireAuth, async (req, res) => {
    try {
      const existing = await db
        .select()
        .from(remindersTable)
        .where(eq(remindersTable.id, req.params.id));
      if (!existing[0]) return res.status(404).json({ error: "Reminder not found" });
      if (existing[0].userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { completed, title, description, type } = req.body;
      const reminder = await storage.updateReminder(req.params.id, {
        completed,
        title,
        description,
        type,
        completedAt: completed ? new Date() : null,
      });
      res.json(reminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", requireAuth, async (req, res) => {
    try {
      const existing = await db
        .select()
        .from(remindersTable)
        .where(eq(remindersTable.id, req.params.id));
      if (!existing[0]) return res.status(404).json({ error: "Reminder not found" });
      if (existing[0].userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await db.delete(remindersTable).where(eq(remindersTable.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // ===== Achievements =====
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievements = await storage.getAchievements(req.session.userId!);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.post("/api/achievements", requireAuth, async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) return res.status(400).json({ error: "title is required" });
      const achievement = await storage.createAchievement({
        userId: req.session.userId!,
        title,
        description: description ?? null,
      });
      res.status(201).json(achievement);
    } catch (error) {
      console.error("Error creating achievement:", error);
      res.status(500).json({ error: "Failed to create achievement" });
    }
  });

  // ===== Medications =====
  app.get("/api/medications", requireAuth, async (req, res) => {
    try {
      const meds = await storage.getMedications(req.session.userId!);
      res.json(meds);
    } catch (err) {
      console.error("Get medications error:", err);
      res.status(500).json({ error: "Failed to load medications" });
    }
  });

  app.post("/api/medications", requireAuth, async (req, res) => {
    try {
      const { name, dosage, frequency, time, notes, active } = req.body || {};
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "name is required" });
      }
      const med = await storage.createMedication({
        userId: req.session.userId!,
        name: name.trim(),
        dosage: dosage || null,
        frequency: frequency || null,
        time: time || null,
        notes: notes || null,
        active: active !== false,
      });
      res.status(201).json(med);
    } catch (err) {
      console.error("Create medication error:", err);
      res.status(500).json({ error: "Failed to save medication" });
    }
  });

  app.patch("/api/medications/:id", requireAuth, async (req, res) => {
    try {
      const { name, dosage, frequency, time, notes, active } = req.body || {};
      const med = await storage.updateMedication(req.params.id, req.session.userId!, {
        name,
        dosage,
        frequency,
        time,
        notes,
        active,
      });
      if (!med) return res.status(404).json({ error: "Medication not found" });
      res.json(med);
    } catch (err) {
      console.error("Update medication error:", err);
      res.status(500).json({ error: "Failed to update medication" });
    }
  });

  app.delete("/api/medications/:id", requireAuth, async (req, res) => {
    try {
      const ok = await storage.deleteMedication(req.params.id, req.session.userId!);
      res.json({ success: ok });
    } catch (err) {
      console.error("Delete medication error:", err);
      res.status(500).json({ error: "Failed to delete medication" });
    }
  });

  // ===== Health Reports =====
  app.get("/api/health-reports", requireAuth, async (req, res) => {
    try {
      const list = await storage.getHealthReports(req.session.userId!);
      res.json(list);
    } catch (err) {
      console.error("Get health reports error:", err);
      res.status(500).json({ error: "Failed to load health reports" });
    }
  });

  app.post("/api/health-reports", requireAuth, async (req, res) => {
    try {
      const { title, summary, heartRate, bloodPressure, bloodOxygen, weight, notes } = req.body || {};
      if (!title) return res.status(400).json({ error: "title is required" });
      const report = await storage.createHealthReport({
        userId: req.session.userId!,
        title: String(title).trim(),
        summary: summary || null,
        heartRate: heartRate != null ? Number(heartRate) : null,
        bloodPressure: bloodPressure || null,
        bloodOxygen: bloodOxygen != null ? Number(bloodOxygen) : null,
        weight: weight || null,
        notes: notes || null,
      });
      res.status(201).json(report);
    } catch (err) {
      console.error("Create health report error:", err);
      res.status(500).json({ error: "Failed to save health report" });
    }
  });

  app.delete("/api/health-reports/:id", requireAuth, async (req, res) => {
    try {
      const ok = await storage.deleteHealthReport(req.params.id, req.session.userId!);
      res.json({ success: ok });
    } catch (err) {
      console.error("Delete health report error:", err);
      res.status(500).json({ error: "Failed to delete health report" });
    }
  });

  // ===== Video Links (YouTube etc.) =====
  app.get("/api/video-links", requireAuth, async (req, res) => {
    try {
      const list = await storage.getVideoLinks(req.session.userId!);
      res.json(list);
    } catch (err) {
      console.error("Get video links error:", err);
      res.status(500).json({ error: "Failed to load video links" });
    }
  });

  app.post("/api/video-links", requireAuth, async (req, res) => {
    try {
      const { title, url, category, description } = req.body || {};
      if (!title || !url) {
        return res.status(400).json({ error: "title and url are required" });
      }
      const link = await storage.createVideoLink({
        userId: req.session.userId!,
        title: String(title).trim(),
        url: String(url).trim(),
        category: category || "health",
        description: description || null,
      });
      res.status(201).json(link);
    } catch (err) {
      console.error("Create video link error:", err);
      res.status(500).json({ error: "Failed to save video link" });
    }
  });

  app.delete("/api/video-links/:id", requireAuth, async (req, res) => {
    try {
      const ok = await storage.deleteVideoLink(req.params.id, req.session.userId!);
      res.json({ success: ok });
    } catch (err) {
      console.error("Delete video link error:", err);
      res.status(500).json({ error: "Failed to delete video link" });
    }
  });

  // ===== Learning Score (LeetCode-style: today / daily / overall) =====
  app.get("/api/learning/score", requireAuth, async (req, res) => {
    try {
      const score = await storage.getLearningScore(req.session.userId!);
      res.json(score);
    } catch (err) {
      console.error("Learning score error:", err);
      res.status(500).json({ error: "Failed to compute learning score" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
