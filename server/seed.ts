import "dotenv/config";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";
import { db } from "./db";
import {
  users as usersTable,
  reminders as remindersTable,
  learningProgress as learningProgressTable,
  healthMetrics as healthMetricsTable,
  achievements as achievementsTable,
} from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "./auth";

type CountedResult<T> = { label: string; rows: T[] };

function logInserted<T>(label: string, rows: T[]): void {
  console.log(`  [OK] ${label}: ${rows.length} row(s) inserted`);
  for (const row of rows) {
    const summary = Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([k, v]) => [
        k,
        typeof v === "string" && v.length > 40 ? v.slice(0, 37) + "..." : v,
      ]),
    );
    console.log(`        -> ${JSON.stringify(summary)}`);
  }
}

async function ensureUser(username: string, password: string) {
  const existing = await storage.getUserByUsername(username);
  if (existing) {
    console.log(`  [SKIP] User "${username}" already exists (id=${existing.id})`);
    return existing;
  }
  const id = randomUUID();
  const hashed = await hashPassword(password);
  await db.insert(usersTable).values({
    id,
    username,
    password: hashed,
    language: "en",
    audioEnabled: true,
  });
  const created = await storage.getUserByUsername(username);
  if (!created) {
    throw new Error(`Failed to create user "${username}"`);
  }
  console.log(`  [OK] User "${username}" created (id=${created.id})`);
  return created;
}

async function hasData(userId: string): Promise<boolean> {
  const [r] = await db
    .select({ id: remindersTable.id })
    .from(remindersTable)
    .where(eq(remindersTable.userId, userId))
    .limit(1);
  if (r) return true;
  const [h] = await db
    .select({ id: healthMetricsTable.id })
    .from(healthMetricsTable)
    .where(eq(healthMetricsTable.userId, userId))
    .limit(1);
  if (h) return true;
  const [a] = await db
    .select({ id: achievementsTable.id })
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, userId))
    .limit(1);
  if (a) return true;
  const [p] = await db
    .select({ id: learningProgressTable.id })
    .from(learningProgressTable)
    .where(eq(learningProgressTable.userId, userId))
    .limit(1);
  return Boolean(p);
}

async function resetUserData(userId: string) {
  console.log(`  [RESET] Wiping existing data for user ${userId}...`);
  await Promise.all([
    db.delete(remindersTable).where(eq(remindersTable.userId, userId)),
    db.delete(healthMetricsTable).where(eq(healthMetricsTable.userId, userId)),
    db.delete(achievementsTable).where(eq(achievementsTable.userId, userId)),
    db.delete(learningProgressTable).where(eq(learningProgressTable.userId, userId)),
  ]);
}

async function seedForUser(userId: string) {
  console.log(`\n[2/4] Seeding reminders for user ${userId}...`);
  const reminderRows = await Promise.all([
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
  ]);
  logInserted("reminders", reminderRows);

  console.log(`\n[3/4] Seeding health metrics...`);
  const healthRows = await Promise.all([
    storage.createHealthMetrics({
      userId,
      heartRate: 72,
      steps: 5234,
      bloodOxygen: 98,
      sleepQuality: "7.5h",
    }),
  ]);
  logInserted("health_metrics", healthRows);

  console.log(`\n[4/4] Seeding achievements & learning progress...`);
  const [achievementRows, progressRows] = await Promise.all([
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
  logInserted("achievements", [achievementRows]);
  logInserted("learning_progress", [progressRows]);
}

async function summarize(userId: string) {
  const [reminders, metrics, achievements, progress] = await Promise.all([
    db.select().from(remindersTable).where(eq(remindersTable.userId, userId)),
    db.select().from(healthMetricsTable).where(eq(healthMetricsTable.userId, userId)),
    db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId)),
    db
      .select()
      .from(learningProgressTable)
      .where(eq(learningProgressTable.userId, userId)),
  ]);
  const results: CountedResult<unknown>[] = [
    { label: "reminders", rows: reminders },
    { label: "health_metrics", rows: metrics },
    { label: "achievements", rows: achievements },
    { label: "learning_progress", rows: progress },
  ];
  console.log("\n=== Database summary for this user ===");
  for (const r of results) {
    console.log(`  ${r.label.padEnd(20)} ${r.rows.length} row(s)`);
  }
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let username = "demo";
  let password = "demo1234";
  let reset = false;
  for (const arg of args) {
    if (arg === "--reset" || arg === "-r") {
      reset = true;
    } else if (arg.startsWith("--password=")) {
      password = arg.split("=")[1] || password;
    } else if (!arg.startsWith("-")) {
      if (username === "demo") username = arg;
      else if (password === "demo1234") password = arg;
    }
  }
  return { username, password, reset };
}

async function seed() {
  const { username, password, reset } = parseArgs(process.argv);

  const start = Date.now();
  console.log("=================================================");
  console.log("  ElderlyConnect - Database Seed");
  console.log("=================================================");
  console.log(`Target user: "${username}"`);
  console.log(`Database:   ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Mode:       ${reset ? "reset + reseed" : "idempotent (skip if data exists)"}`);
  console.log("");

  console.log("[1/4] Ensuring user exists...");
  const user = await ensureUser(username, password);

  const exists = await hasData(user.id);
  if (exists && !reset) {
    console.log(`\n  [SKIP] User "${username}" already has seeded data.`);
    console.log("         Re-run with --reset to wipe and reseed.");
    await summarize(user.id);
    console.log("\n=================================================\n");
    process.exit(0);
  }
  if (reset) await resetUserData(user.id);

  await seedForUser(user.id);
  await summarize(user.id);

  const ms = Date.now() - start;
  console.log("\n=================================================");
  console.log(`  Seed complete in ${ms} ms.`);
  console.log(`  Sign in as "${username}" / "${password}" to see the dashboard.`);
  console.log("=================================================\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n[FAIL] Seed failed:", err);
  process.exit(1);
});
