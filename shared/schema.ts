import { sql } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  json,
  int,
  boolean,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  language: varchar("language", { length: 8 }).notNull().default("en"),
  audioEnabled: boolean("audio_enabled").notNull().default(true),
});

export const conversations = mysqlTable("conversations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  topic: text("topic"),
  messages: json("messages").notNull().$type<MessageItem[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const learningProgress = mysqlTable("learning_progress", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  appName: varchar("app_name", { length: 100 }).notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

export const healthMetrics = mysqlTable("health_metrics", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  heartRate: int("heart_rate"),
  steps: int("steps"),
  bloodOxygen: int("blood_oxygen"),
  sleepQuality: varchar("sleep_quality", { length: 50 }),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const reminders = mysqlTable("reminders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const achievements = mysqlTable("achievements", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const devices = mysqlTable("devices", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id", { length: 100 }).notNull(),
  name: text("name").notNull(),
  kind: varchar("kind", { length: 50 }).notNull().default("ble-generic"),
  manufacturer: text("manufacturer"),
  services: json("services").$type<string[]>().default([]),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  pairedAt: timestamp("paired_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const aiTutorials = mysqlTable("ai_tutorials", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topic: varchar("topic", { length: 200 }).notNull(),
  app: varchar("app", { length: 50 }),
  category: varchar("category", { length: 50 }),
  tags: json("tags").$type<string[]>().default([]),
  intro: text("intro").notNull(),
  steps: json("steps").notNull().$type<{ title: string; description: string; tip?: string }[]>(),
  success: text("success").notNull(),
  quiz: json("quiz").notNull().$type<QuizQuestion[]>().default([]),
  score: int("score"),
  total: int("total"),
  source: varchar("source", { length: 50 }).notNull().default("ai"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const tutorialStepProgress = mysqlTable("tutorial_step_progress", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tutorialId: varchar("tutorial_id", { length: 36 })
    .notNull()
    .references(() => aiTutorials.id, { onDelete: "cascade" }),
  stepIndex: int("step_index").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const medications = mysqlTable("medications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  dosage: varchar("dosage", { length: 80 }),
  frequency: varchar("frequency", { length: 80 }),
  time: varchar("time", { length: 20 }),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const healthReports = mysqlTable("health_reports", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary"),
  heartRate: int("heart_rate"),
  bloodPressure: varchar("blood_pressure", { length: 40 }),
  bloodOxygen: int("blood_oxygen"),
  weight: varchar("weight", { length: 40 }),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const videoLinks = mysqlTable("video_links", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  url: text("url").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("health"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

type MessageItem = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  language: true,
  audioEnabled: true,
});

export const insertConversationSchema = createInsertSchema(conversations)
  .pick({
    userId: true,
    title: true,
    topic: true,
    messages: true,
  })
  .extend({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
          timestamp: z.string().optional(),
        }),
      )
      .default([]),
  });

export const insertLearningProgressSchema = createInsertSchema(learningProgress).pick({
  userId: true,
  appName: true,
  completed: true,
  completedAt: true,
});

export const insertHealthMetricsSchema = createInsertSchema(healthMetrics).pick({
  userId: true,
  heartRate: true,
  steps: true,
  bloodOxygen: true,
  sleepQuality: true,
});

export const insertReminderSchema = createInsertSchema(reminders).pick({
  userId: true,
  title: true,
  description: true,
  type: true,
  completed: true,
  completedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  userId: true,
  title: true,
  description: true,
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  userId: true,
  deviceId: true,
  name: true,
  kind: true,
  manufacturer: true,
  services: true,
  metadata: true,
});

export const insertAiTutorialSchema = createInsertSchema(aiTutorials).pick({
  userId: true,
  topic: true,
  app: true,
  category: true,
  tags: true,
  intro: true,
  steps: true,
  success: true,
  quiz: true,
  source: true,
});

export const insertMedicationSchema = createInsertSchema(medications).pick({
  userId: true,
  name: true,
  dosage: true,
  frequency: true,
  time: true,
  notes: true,
  active: true,
});

export const insertHealthReportSchema = createInsertSchema(healthReports).pick({
  userId: true,
  title: true,
  summary: true,
  heartRate: true,
  bloodPressure: true,
  bloodOxygen: true,
  weight: true,
  notes: true,
});

export const insertVideoLinkSchema = createInsertSchema(videoLinks).pick({
  userId: true,
  title: true,
  url: true,
  category: true,
  description: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type LearningProgress = typeof learningProgress.$inferSelect;
export type InsertLearningProgress = z.infer<typeof insertLearningProgressSchema>;
export type HealthMetrics = typeof healthMetrics.$inferSelect;
export type InsertHealthMetrics = z.infer<typeof insertHealthMetricsSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type AiTutorial = typeof aiTutorials.$inferSelect;
export type InsertAiTutorial = z.infer<typeof insertAiTutorialSchema>;
export type TutorialStepProgress = typeof tutorialStepProgress.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type HealthReport = typeof healthReports.$inferSelect;
export type InsertHealthReport = z.infer<typeof insertHealthReportSchema>;
export type VideoLink = typeof videoLinks.$inferSelect;
export type InsertVideoLink = z.infer<typeof insertVideoLinkSchema>;
