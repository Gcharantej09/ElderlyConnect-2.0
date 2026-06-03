import { randomUUID } from "node:crypto";
import {
  type User,
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type LearningProgress,
  type InsertLearningProgress,
  type HealthMetrics,
  type InsertHealthMetrics,
  type Reminder,
  type InsertReminder,
  type Achievement,
  type InsertAchievement,
  type Device,
  type InsertDevice,
  type AiTutorial,
  type InsertAiTutorial,
  type TutorialStepProgress,
  type Medication,
  type InsertMedication,
  type HealthReport,
  type InsertHealthReport,
  type VideoLink,
  type InsertVideoLink,
  users as usersTable,
  conversations as conversationsTable,
  learningProgress as learningProgressTable,
  healthMetrics as healthMetricsTable,
  reminders as remindersTable,
  achievements as achievementsTable,
  devices as devicesTable,
  aiTutorials as aiTutorialsTable,
  tutorialStepProgress as tutorialStepProgressTable,
  medications as medicationsTable,
  healthReports as healthReportsTable,
  videoLinks as videoLinksTable,
} from "@shared/schema";
import { db } from "./db";
import { and, desc, eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  getAllConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(
    id: string,
    conversation: Partial<InsertConversation>,
  ): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  getLearningProgress(userId: string, appName?: string): Promise<LearningProgress[]>;
  createLearningProgress(progress: InsertLearningProgress): Promise<LearningProgress>;
  updateLearningProgress(
    id: string,
    progress: Partial<InsertLearningProgress>,
  ): Promise<LearningProgress | undefined>;

  getLatestHealthMetrics(userId: string): Promise<HealthMetrics | undefined>;
  createHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics>;

  getReminders(userId: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(
    id: string,
    reminder: Partial<InsertReminder>,
  ): Promise<Reminder | undefined>;

  getAchievements(userId: string): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;

  getDevices(userId: string): Promise<Device[]>;
  getDevice(id: string, userId: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, userId: string, updates: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: string, userId: string): Promise<boolean>;

  getAiTutorials(userId: string): Promise<AiTutorial[]>;
  getAiTutorial(id: string, userId: string): Promise<AiTutorial | undefined>;
  createAiTutorial(tutorial: InsertAiTutorial): Promise<AiTutorial>;
  updateAiTutorial(id: string, userId: string, updates: Partial<AiTutorial>): Promise<AiTutorial | undefined>;
  deleteAiTutorial(id: string, userId: string): Promise<boolean>;

  getStepProgress(tutorialId: string, userId: string): Promise<TutorialStepProgress[]>;
  markStepComplete(tutorialId: string, userId: string, stepIndex: number): Promise<TutorialStepProgress>;

  getMedications(userId: string): Promise<Medication[]>;
  createMedication(med: InsertMedication): Promise<Medication>;
  updateMedication(id: string, userId: string, updates: Partial<InsertMedication>): Promise<Medication | undefined>;
  deleteMedication(id: string, userId: string): Promise<boolean>;

  getHealthReports(userId: string): Promise<HealthReport[]>;
  createHealthReport(report: InsertHealthReport): Promise<HealthReport>;
  deleteHealthReport(id: string, userId: string): Promise<boolean>;

  getVideoLinks(userId: string): Promise<VideoLink[]>;
  createVideoLink(link: InsertVideoLink): Promise<VideoLink>;
  deleteVideoLink(id: string, userId: string): Promise<boolean>;

  getLearningScore(userId: string): Promise<{
    today: number;
    daily: number;
    overall: number;
    streak: number;
    completedToday: number;
  }>;
}

export class DbStorage implements IStorage {
  // ===== Users =====
  async getUser(id: string): Promise<User | undefined> {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    await db.insert(usersTable).values({ id, ...insertUser });
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return rows[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return rows[0];
  }

  // ===== Conversations =====
  async getAllConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, userId))
      .orderBy(desc(conversationsTable.createdAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const rows = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    return rows[0];
  }

  async createConversation(input: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    await db.insert(conversationsTable).values({
      id,
      userId: input.userId,
      title: input.title,
      topic: input.topic ?? null,
      messages: (input.messages ?? []) as any,
    });
    const rows = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    return rows[0];
  }

  async updateConversation(
    id: string,
    updates: Partial<InsertConversation>,
  ): Promise<Conversation | undefined> {
    await db.update(conversationsTable).set(updates as any).where(eq(conversationsTable.id, id));
    const rows = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    return rows[0];
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db
      .delete(conversationsTable)
      .where(eq(conversationsTable.id, id));
    return (result as any).affectedRows > 0;
  }

  // ===== Learning Progress =====
  async getLearningProgress(
    userId: string,
    appName?: string,
  ): Promise<LearningProgress[]> {
    if (appName) {
      return await db
        .select()
        .from(learningProgressTable)
        .where(
          and(
            eq(learningProgressTable.userId, userId),
            eq(learningProgressTable.appName, appName),
          ),
        );
    }
    return await db
      .select()
      .from(learningProgressTable)
      .where(eq(learningProgressTable.userId, userId));
  }

  async createLearningProgress(
    progress: InsertLearningProgress,
  ): Promise<LearningProgress> {
    const id = randomUUID();
    await db.insert(learningProgressTable).values({ id, ...progress });
    const rows = await db
      .select()
      .from(learningProgressTable)
      .where(eq(learningProgressTable.id, id));
    return rows[0];
  }

  async updateLearningProgress(
    id: string,
    updates: Partial<InsertLearningProgress>,
  ): Promise<LearningProgress | undefined> {
    await db
      .update(learningProgressTable)
      .set(updates as any)
      .where(eq(learningProgressTable.id, id));
    const rows = await db
      .select()
      .from(learningProgressTable)
      .where(eq(learningProgressTable.id, id));
    return rows[0];
  }

  // ===== Health Metrics =====
  async getLatestHealthMetrics(userId: string): Promise<HealthMetrics | undefined> {
    const rows = await db
      .select()
      .from(healthMetricsTable)
      .where(eq(healthMetricsTable.userId, userId))
      .orderBy(desc(healthMetricsTable.recordedAt))
      .limit(1);
    return rows[0];
  }

  async createHealthMetrics(
    metrics: InsertHealthMetrics,
  ): Promise<HealthMetrics> {
    const id = randomUUID();
    await db.insert(healthMetricsTable).values({ id, ...metrics });
    const rows = await db
      .select()
      .from(healthMetricsTable)
      .where(eq(healthMetricsTable.id, id));
    return rows[0];
  }

  // ===== Reminders =====
  async getReminders(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.userId, userId))
      .orderBy(desc(remindersTable.createdAt));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    await db.insert(remindersTable).values({ id, ...reminder });
    const rows = await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.id, id));
    return rows[0];
  }

  async updateReminder(
    id: string,
    updates: Partial<InsertReminder>,
  ): Promise<Reminder | undefined> {
    await db
      .update(remindersTable)
      .set(updates as any)
      .where(eq(remindersTable.id, id));
    const rows = await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.id, id));
    return rows[0];
  }

  // ===== Achievements =====
  async getAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievementsTable)
      .where(eq(achievementsTable.userId, userId))
      .orderBy(desc(achievementsTable.earnedAt));
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    await db.insert(achievementsTable).values({ id, ...achievement });
    const rows = await db
      .select()
      .from(achievementsTable)
      .where(eq(achievementsTable.id, id));
    return rows[0];
  }

  // ===== Devices =====
  async getDevices(userId: string): Promise<Device[]> {
    return await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.userId, userId))
      .orderBy(desc(devicesTable.pairedAt));
  }

  async getDevice(id: string, userId: string): Promise<Device | undefined> {
    const rows = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)));
    return rows[0];
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const id = randomUUID();
    await db.insert(devicesTable).values({ id, ...device } as any);
    const rows = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.id, id));
    return rows[0];
  }

  async updateDevice(
    id: string,
    userId: string,
    updates: Partial<InsertDevice>,
  ): Promise<Device | undefined> {
    await db
      .update(devicesTable)
      .set({ ...updates, lastSeenAt: new Date() } as any)
      .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)));
    const rows = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)));
    return rows[0];
  }

  async deleteDevice(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(devicesTable)
      .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)));
    return (result as any).affectedRows > 0;
  }

  // ===== AI Tutorials =====
  async getAiTutorials(userId: string): Promise<AiTutorial[]> {
    return await db
      .select()
      .from(aiTutorialsTable)
      .where(eq(aiTutorialsTable.userId, userId))
      .orderBy(desc(aiTutorialsTable.createdAt));
  }

  async getAiTutorial(id: string, userId: string): Promise<AiTutorial | undefined> {
    const rows = await db
      .select()
      .from(aiTutorialsTable)
      .where(and(eq(aiTutorialsTable.id, id), eq(aiTutorialsTable.userId, userId)));
    return rows[0];
  }

  async createAiTutorial(tutorial: InsertAiTutorial): Promise<AiTutorial> {
    const id = randomUUID();
    await db.insert(aiTutorialsTable).values({ id, ...tutorial } as any);
    const rows = await db
      .select()
      .from(aiTutorialsTable)
      .where(eq(aiTutorialsTable.id, id));
    return rows[0];
  }

  async updateAiTutorial(
    id: string,
    userId: string,
    updates: Partial<AiTutorial>,
  ): Promise<AiTutorial | undefined> {
    await db
      .update(aiTutorialsTable)
      .set(updates as any)
      .where(and(eq(aiTutorialsTable.id, id), eq(aiTutorialsTable.userId, userId)));
    const rows = await db
      .select()
      .from(aiTutorialsTable)
      .where(and(eq(aiTutorialsTable.id, id), eq(aiTutorialsTable.userId, userId)));
    return rows[0];
  }

  async deleteAiTutorial(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(aiTutorialsTable)
      .where(and(eq(aiTutorialsTable.id, id), eq(aiTutorialsTable.userId, userId)));
    return (result as any).affectedRows > 0;
  }

  // ===== Tutorial step progress =====
  async getStepProgress(tutorialId: string, userId: string): Promise<TutorialStepProgress[]> {
    return await db
      .select()
      .from(tutorialStepProgressTable)
      .where(
        and(
          eq(tutorialStepProgressTable.tutorialId, tutorialId),
          eq(tutorialStepProgressTable.userId, userId),
        ),
      )
      .orderBy(tutorialStepProgressTable.stepIndex);
  }

  async markStepComplete(
    tutorialId: string,
    userId: string,
    stepIndex: number,
  ): Promise<TutorialStepProgress> {
    const existing = await db
      .select()
      .from(tutorialStepProgressTable)
      .where(
        and(
          eq(tutorialStepProgressTable.tutorialId, tutorialId),
          eq(tutorialStepProgressTable.userId, userId),
          eq(tutorialStepProgressTable.stepIndex, stepIndex),
        ),
      );
    if (existing[0]) return existing[0];
    const id = randomUUID();
    await db.insert(tutorialStepProgressTable).values({ id, tutorialId, userId, stepIndex });
    const rows = await db
      .select()
      .from(tutorialStepProgressTable)
      .where(eq(tutorialStepProgressTable.id, id));
    return rows[0];
  }

  // ===== Medications =====
  async getMedications(userId: string): Promise<Medication[]> {
    return await db
      .select()
      .from(medicationsTable)
      .where(eq(medicationsTable.userId, userId))
      .orderBy(desc(medicationsTable.createdAt));
  }

  async createMedication(med: InsertMedication): Promise<Medication> {
    const id = randomUUID();
    await db.insert(medicationsTable).values({ id, ...med } as any);
    const rows = await db.select().from(medicationsTable).where(eq(medicationsTable.id, id));
    return rows[0];
  }

  async updateMedication(
    id: string,
    userId: string,
    updates: Partial<InsertMedication>,
  ): Promise<Medication | undefined> {
    await db
      .update(medicationsTable)
      .set(updates as any)
      .where(and(eq(medicationsTable.id, id), eq(medicationsTable.userId, userId)));
    const rows = await db
      .select()
      .from(medicationsTable)
      .where(and(eq(medicationsTable.id, id), eq(medicationsTable.userId, userId)));
    return rows[0];
  }

  async deleteMedication(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(medicationsTable)
      .where(and(eq(medicationsTable.id, id), eq(medicationsTable.userId, userId)));
    return (result as any).affectedRows > 0;
  }

  // ===== Health Reports =====
  async getHealthReports(userId: string): Promise<HealthReport[]> {
    return await db
      .select()
      .from(healthReportsTable)
      .where(eq(healthReportsTable.userId, userId))
      .orderBy(desc(healthReportsTable.recordedAt));
  }

  async createHealthReport(report: InsertHealthReport): Promise<HealthReport> {
    const id = randomUUID();
    await db.insert(healthReportsTable).values({ id, ...report } as any);
    const rows = await db.select().from(healthReportsTable).where(eq(healthReportsTable.id, id));
    return rows[0];
  }

  async deleteHealthReport(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(healthReportsTable)
      .where(and(eq(healthReportsTable.id, id), eq(healthReportsTable.userId, userId)));
    return (result as any).affectedRows > 0;
  }

  // ===== Video Links =====
  async getVideoLinks(userId: string): Promise<VideoLink[]> {
    return await db
      .select()
      .from(videoLinksTable)
      .where(eq(videoLinksTable.userId, userId))
      .orderBy(desc(videoLinksTable.createdAt));
  }

  async createVideoLink(link: InsertVideoLink): Promise<VideoLink> {
    const id = randomUUID();
    await db.insert(videoLinksTable).values({ id, ...link } as any);
    const rows = await db.select().from(videoLinksTable).where(eq(videoLinksTable.id, id));
    return rows[0];
  }

  async deleteVideoLink(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(videoLinksTable)
      .where(and(eq(videoLinksTable.id, id), eq(videoLinksTable.userId, userId)));
    return (result as any).affectedRows > 0;
  }

  // ===== Learning Score (LeetCode-style aggregate) =====
  //   today  = tutorials fully completed (quiz attempted) today
  //   daily  = total distinct tutorials completed in the last 7 days
  //   overall = lifetime completed tutorials
  //   streak = consecutive days (up to today) with at least one completion
  async getLearningScore(userId: string) {
    const all = await db
      .select()
      .from(aiTutorialsTable)
      .where(eq(aiTutorialsTable.userId, userId));
    const completed = all.filter((t) => t.completedAt);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const today = completed.filter((t) => new Date(t.completedAt!) >= startOfToday).length;
    const daily = completed.filter((t) => new Date(t.completedAt!) >= sevenDaysAgo).length;
    const overall = completed.length;

    // Streak: walk back from today, count consecutive days with >=1 completion
    const daysWithCompletion = new Set<string>();
    completed.forEach((t) => {
      const d = new Date(t.completedAt!);
      d.setHours(0, 0, 0, 0);
      daysWithCompletion.add(d.toISOString().slice(0, 10));
    });
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (daysWithCompletion.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { today, daily, overall, streak, completedToday: today };
  }
}

export const storage: IStorage = new DbStorage();
