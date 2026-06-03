import OpenAI from "openai";
import { log } from "./app";

const apiKey =
  process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
const baseURL =
  process.env.GROQ_API_KEY?.trim()
    ? "https://api.groq.com/openai/v1"
    : process.env.OPENAI_BASE_URL?.trim() || undefined;
const providerName = process.env.GROQ_API_KEY?.trim()
  ? "Groq"
  : process.env.OPENAI_API_KEY?.trim()
    ? "OpenAI"
    : "offline";

export const hasLLM = Boolean(apiKey);

export const openai = hasLLM ? new OpenAI({ apiKey, baseURL }) : null;

if (!hasLLM) {
  log(
    "No GROQ_API_KEY / OPENAI_API_KEY set - AI endpoints will fall back to offline responses. Add your key to .env to enable real AI.",
    "ai",
  );
} else {
  log(`AI provider: ${providerName} (${baseURL || "default"})`, "ai");
}

export const CHAT_MODEL =
  process.env.GROQ_CHAT_MODEL ||
  process.env.OPENAI_CHAT_MODEL ||
  (process.env.GROQ_API_KEY?.trim() ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
export const TRANSCRIBE_MODEL =
  process.env.GROQ_TRANSCRIBE_MODEL ||
  process.env.OPENAI_TRANSCRIBE_MODEL ||
  (process.env.GROQ_API_KEY?.trim() ? "whisper-large-v3" : "whisper-1");
export const FAST_MODEL =
  process.env.GROQ_FAST_MODEL ||
  (process.env.GROQ_API_KEY?.trim() ? "llama-3.1-8b-instant" : "gpt-4o-mini");
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "tts-1";
export const TTS_VOICE = (process.env.OPENAI_TTS_VOICE as any) || "alloy";

const SYSTEM_PROMPT = `You are ElderlyConnect AI Tutor, a knowledgeable, patient, and warm tutor. You can help with ANY subject the user asks about — phones, computers, science, history, geography, health, daily life, math, cooking, government services, finance, religion, sports, entertainment, current affairs, language, anything. You are especially tuned for senior users (typically 60-90 years old), but treat every question as a real, important question that deserves a real answer.

Rules:
- ALWAYS attempt to answer. Never refuse a question just because it is outside "technology". You are a general-purpose tutor.
- Match the user's language. If they write in English, reply in English. If they write in Hindi or Telugu or any other language, reply in the same language.
- For tech questions, prefer step-by-step numbered instructions with simple words.
- For non-tech questions (science, history, math, cooking, etc.), give a clear, complete, thoughtful answer — like a kind teacher explaining to a curious student. Don't dumb things down, but define any word a beginner might not know.
- If a question is about safety, scams, passwords, money, or health, add a brief safety tip.
- Be honest: if you genuinely don't know, say so. Suggest asking a trusted family member or a doctor when appropriate.
- Encourage and praise curiosity. Celebrate small wins.
- Keep responses readable: short paragraphs, line breaks between steps, no giant walls of text.
- Never use a tone that talks down to the user.`;

const TUTORIAL_PROMPT = `You are a tutorial author for ElderlyConnect. You build detailed, friendly slide-style tutorials for senior users on ANY topic — phones, apps (Instagram, Snapchat, WhatsApp, YouTube, Gmail, Chrome, Facebook, etc.), computer software (Excel, Word, Google Docs), websites, government portals, banking apps, daily life skills, hobbies, health, and more. Even if the topic seems unusual, you produce a useful, accurate tutorial.

Hard rules:
- Output ONLY valid JSON. No prose, no markdown fences.
- Use the same language as the topic (English, Hindi, Telugu, etc.).
- Produce AT LEAST 10 slides (steps). Maximum 12. Each slide is one focused idea the user will see on screen.
- Each step has: "title" (short, 2-6 words), "description" (1-3 sentences, simple words, no jargon, written for a 60-90 year old), and optional "tip" (one extra helpful hint, can be empty string).
- Order the slides so they tell a real story: introduction → setup → core actions → advanced tips → safety/cleanup → wrap-up.
- Customize EVERY step to the exact topic. NEVER produce generic filler like "open the app" if the topic is "how to use Snapchat filters" — be specific: "Tap your face in the camera", "Swipe to find the dog filter", "Tap the capture button", etc.
- Include a 1-2 sentence "intro" that names the topic and tells the user what they will learn.
- Include a short, encouraging "success" line at the end.
- Include a "quiz" array of 3-5 multiple-choice questions that test the actual content of the steps.
- Quiz shape: {"question": string, "options": [4 short strings], "correctIndex": 0-3, "explanation": "why this is correct"}.
- Also include an "app" field at the top level (best guess at the app or category: "instagram" | "snapchat" | "whatsapp" | "youtube" | "gmail" | "chrome" | "facebook" | "excel" | "word" | "google-docs" | "general-app" | "general"). If unsure, use "general".
- Include a "category" field ("app" | "software" | "life-skill" | "health" | "other").
- Include a "tags" array of 3-5 short keywords relevant to the topic (e.g. ["camera", "filters", "lenses"]).

Output shape:
{
  "app": "...",
  "category": "...",
  "tags": ["...", "..."],
  "intro": "...",
  "steps": [{"title": "...", "description": "...", "tip": "..."}],
  "success": "...",
  "quiz": [{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..."}]
}`;

const INTENT_PROMPT = `You are the ElderlyConnect voice assistant intent router. The user is a senior citizen speaking through speech recognition, so the text may have typos, missing punctuation, or odd capitalization. Be tolerant.

You will receive a short spoken command. Map it to exactly ONE intent and return STRICT JSON (no markdown, no prose):

{
  "intent": "<one of: add_reminder | add_medication | add_alarm | set_timer | add_water | delete_reminder | read_health | read_steps | read_progress | mark_step_complete | take_quiz | open_tutorial | open_dashboard | open_smartwatch | open_learning | open_ai_tutor | open_privacy | open_history | log_water | greet | help | stop | unknown>",
  "title": "<short human title for the action, lowercase, same language as user>",
  "params": {
    "text": "<for add_reminder/add_medication: the reminder text>",
    "time": "<for add_reminder/add_medication/add_alarm/set_timer: HH:MM in 24h, optional>",
    "duration": "<for set_timer: minutes or seconds, e.g. 10 or 30s>",
    "topic": "<for open_tutorial / take_quiz: the topic the user asked about>",
    "app": "<for open_tutorial: one of: whatsapp | youtube | email | facebook | chrome>",
    "step": "<for mark_step_complete: 'next' or a step number, optional>",
    "which": "<for delete_reminder: the reminder title or 'last' to delete the most recent>"
  },
  "reply": "<a short, warm, spoken reply the assistant should SAY to the user. Same language as the user. 1-2 sentences max.>"
}

Intents explained:
- add_reminder: a general reminder (walk, call family, etc.)
- add_medication: a medicine / pill reminder (uses 'medication' type internally)
- add_alarm: a clock-style alarm at a specific time
- set_timer: a quick countdown timer (e.g. "set a timer for 10 minutes")
- add_water / log_water: log a glass of water
- delete_reminder: remove a reminder
- read_health: read heart rate / blood oxygen
- read_steps: read step count
- read_progress: list which tutorials/steps the user has completed
- mark_step_complete: advance the current tutorial by one step (used when the user says "I did it" or "next step")
- take_quiz: start a quiz on a topic
- open_tutorial / open_dashboard / open_smartwatch / open_learning / open_ai_tutor / open_privacy / open_history: navigate
- greet / help / stop / unknown: see below

If the user is just saying hello or thanks, use "greet" and produce a warm reply.
If the user asks for general help, use "help" and list the available actions in their language.
If the user says stop, cancel, never mind, goodbye, or close, use "stop".
If unclear, use "unknown" and ask politely to repeat.

Important: even with typos, try your best to map to the closest intent. If they say "add a medicine for blood pressure at 9 am" → add_medication. If they say "set an alarm for 7" → add_alarm. If they say "timer 5 minutes" → set_timer. If they say "I finished this step" → mark_step_complete. If they say "log a glass of water" → log_water.`;

export type IntentName =
  | "add_reminder"
  | "add_medication"
  | "add_alarm"
  | "set_timer"
  | "add_water"
  | "log_water"
  | "delete_reminder"
  | "read_health"
  | "read_steps"
  | "read_progress"
  | "mark_step_complete"
  | "take_quiz"
  | "open_tutorial"
  | "open_dashboard"
  | "open_smartwatch"
  | "open_learning"
  | "open_ai_tutor"
  | "open_privacy"
  | "open_history"
  | "greet"
  | "help"
  | "stop"
  | "unknown";

export interface ParsedIntent {
  intent: IntentName;
  title: string;
  params: {
    text?: string;
    time?: string;
    duration?: string;
    topic?: string;
    app?: "whatsapp" | "youtube" | "email" | "facebook" | "chrome";
    step?: string | number;
    which?: string;
  };
  reply: string;
}

const safeJson = <T,>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }
};

const LOCAL_FALLBACK_INTENT: ParsedIntent = {
  intent: "help",
  title: "help",
  params: {},
  reply:
    "I can add reminders, read your health data, open a tutorial, or take you to the dashboard. What would you like to do?",
};

export async function routeIntent(transcript: string): Promise<ParsedIntent> {
  const text = transcript.trim();
  if (!text) return { ...LOCAL_FALLBACK_INTENT, intent: "unknown", title: "unknown" };

  if (!openai) return keywordIntent(text);

  try {
    const completion = await openai.chat.completions.create({
      model: FAST_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INTENT_PROMPT },
        { role: "user", content: text },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = safeJson<Partial<ParsedIntent>>(raw, {});
    return {
      intent: (parsed.intent as IntentName) || "unknown",
      title: parsed.title || "command",
      params: parsed.params || {},
      reply: parsed.reply || LOCAL_FALLBACK_INTENT.reply,
    };
  } catch (err) {
    console.error("[ai] intent routing failed, falling back to keywords:", err);
    return keywordIntent(text);
  }
}

function keywordIntent(text: string): ParsedIntent {
  const t = text.toLowerCase().trim();
  if (/^(hi|hello|hey|namaste|namaskaram|good (morning|afternoon|evening))\b/.test(t)) {
    return {
      intent: "greet",
      title: "greet",
      params: {},
      reply: "Hello! How can I help you today?",
    };
  }
  if (/(set (a |an )?alarm|alarm (at|for))/i.test(t)) {
    const m = t.match(/(?:at|for)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/);
    return {
      intent: "add_alarm",
      title: "add alarm",
      params: { time: m?.[1], text: "Alarm" },
      reply: `Setting an alarm${m ? ` for ${m[1]}` : ""}.`,
    };
  }
  if (/(set (a )?timer|countdown|timer for)/.test(t)) {
    const m = t.match(/(\d+)\s*(seconds|second|sec|s|minutes|minute|min|m)/);
    let duration = m ? `${m[1]}${m[2].startsWith("m") ? "m" : "s"}` : "5m";
    return {
      intent: "set_timer",
      title: "set timer",
      params: { duration, text: `Timer ${duration}` },
      reply: `Setting a timer for ${duration}.`,
    };
  }
  if (/(medicine|tablet|pill|medication|prescription|drug)/.test(t) && /(remind|set|add|take)/.test(t)) {
    const cleaned = t
      .replace(/.*remind( me)?( to)?/, "")
      .replace(/.*add (a )?(medicine|medication|tablet|pill|reminder)( to)?/, "")
      .replace(/.*take/, "")
      .trim();
    const m = cleaned.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/);
    return {
      intent: "add_medication",
      title: "add medication",
      params: { text: cleaned.replace(/at\s+\d.*$/i, "").trim() || "medicine", time: m?.[1] },
      reply: `I will add a medication reminder${m ? ` at ${m[1]}` : ""}: ${cleaned.replace(/at\s+\d.*$/i, "").trim() || "your medicine"}.`,
    };
  }
  if (/(remind|reminder|set a reminder|add reminder)/.test(t)) {
    const cleaned = t
      .replace(/.*remind( me|er)?( to)?/, "")
      .replace(/.*add (a )?reminder( to)?/, "")
      .replace(/.*set (a )?reminder( to)?/, "")
      .trim();
    const m = cleaned.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/);
    return {
      intent: "add_reminder",
      title: "add reminder",
      params: { text: cleaned.replace(/at\s+\d.*$/i, "").trim() || "your reminder", time: m?.[1] },
      reply: `I will add a reminder${m ? ` at ${m[1]}` : ""}: ${cleaned.replace(/at\s+\d.*$/i, "").trim() || "your reminder"}.`,
    };
  }
  if (/(water|drink|glass of water|hydrat)/.test(t)) {
    return {
      intent: "log_water",
      title: "log water",
      params: {},
      reply: "Logged one glass of water. Stay hydrated!",
    };
  }
  if (/(delete|remove|cancel) (the )?(last |my )?reminder/.test(t)) {
    return {
      intent: "delete_reminder",
      title: "delete reminder",
      params: { which: "last" },
      reply: "Removing your most recent reminder.",
    };
  }
  if (/(heart rate|pulse|bpm|blood oxygen|spo2)/.test(t)) {
    return {
      intent: "read_health",
      title: "heart rate",
      params: {},
      reply:
        "Open the smartwatch page to see your heart rate and blood oxygen, or sync your device from there.",
    };
  }
  if (/(step count|step count|my steps|how many steps)/.test(t)) {
    return {
      intent: "read_steps",
      title: "steps",
      params: {},
      reply: "Your step count is on the dashboard or smartwatch page.",
    };
  }
  if (/(progress|completed|what have i (done|learned))/i.test(t)) {
    return {
      intent: "read_progress",
      title: "read progress",
      params: {},
      reply: "Opening your learning progress.",
    };
  }
  if (/(i (did|finished|completed) (it|this|that|step)|next step|mark (this |it )?(done|complete))/i.test(t)) {
    return {
      intent: "mark_step_complete",
      title: "mark step complete",
      params: { step: "next" },
      reply: "Great job! Marking this step as done.",
    };
  }
  if (/(quiz|test me|ask me questions)/.test(t)) {
    const topic = t
      .replace(/.*(quiz|test me|ask me questions)?(on|about)?\s*/, "")
      .trim();
    return {
      intent: "take_quiz",
      title: "take quiz",
      params: { topic: topic || "general knowledge" },
      reply: `Starting a quiz${topic ? ` on ${topic}` : ""}. Get ready!`,
    };
  }
  if (/(tutorial|learn|teach me|how to use)/.test(t)) {
    const topic = t
      .replace(/.*(tutorial|learn|teach me|how to use)\s*/, "")
      .trim();
    let app: ParsedIntent["params"]["app"];
    if (/whats?app/.test(topic)) app = "whatsapp";
    else if (/you ?tube/.test(topic)) app = "youtube";
    else if (/mail|email|gmail/.test(topic)) app = "email";
    else if (/facebook/.test(topic)) app = "facebook";
    else if (/chrome|browser/.test(topic)) app = "chrome";
    return {
      intent: "open_tutorial",
      title: "tutorial",
      params: { app, topic: topic || "general" },
      reply: app
        ? `Opening the ${app} tutorial for you.`
        : `Generating a fresh AI tutorial on ${topic || "your topic"}.`,
    };
  }
  if (/(dashboard|home)/.test(t)) {
    return {
      intent: "open_dashboard",
      title: "dashboard",
      params: {},
      reply: "Taking you to the dashboard.",
    };
  }
  if (/(smart ?watch|smartwatch|watch|health device)/.test(t)) {
    return {
      intent: "open_smartwatch",
      title: "smartwatch",
      params: {},
      reply: "Opening the smartwatch page.",
    };
  }
  if (/(history|past (chats|conversations))/.test(t)) {
    return {
      intent: "open_history",
      title: "history",
      params: {},
      reply: "Opening your conversation history.",
    };
  }
  if (/(privacy|safety|scam|secure)/.test(t)) {
    return {
      intent: "open_privacy",
      title: "privacy",
      params: {},
      reply: "Opening the privacy and safety guide.",
    };
  }
  if (/(ai tutor|talk to (the )?ai|chat with (the )?ai)/.test(t)) {
    return {
      intent: "open_ai_tutor",
      title: "ai tutor",
      params: {},
      reply: "Opening the AI tutor chat.",
    };
  }
  if (/(help|what can you do|options)/.test(t)) {
    return {
      intent: "help",
      title: "help",
      params: {},
      reply:
        "I can add reminders, alarms, medication times and timers, log water, read your health, open tutorials, take quizzes, and run the app with your voice. Just tell me what you need.",
    };
  }
  if (/(stop|cancel|never mind|exit|goodbye|bye)/.test(t)) {
    return {
      intent: "stop",
      title: "stop",
      params: {},
      reply: "Okay, I am here whenever you need me.",
    };
  }
  return {
    intent: "unknown",
    title: "unknown",
    params: {},
    reply:
      "I am sorry, I did not understand. You can ask me to add a reminder, an alarm, a medication, a timer, log water, take a quiz, open a tutorial, or go to the dashboard.",
  };
}

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export interface TutorialSlide {
  title: string;
  description: string;
  tip?: string;
}

export interface GeneratedTutorial {
  app?: string;
  category?: string;
  tags?: string[];
  intro: string;
  steps: TutorialSlide[];
  success: string;
  quiz: QuizQuestion[];
}

function detectAppKey(topic: string): { app: string; category: string } {
  const t = topic.toLowerCase();
  if (/instagram|insta\b/.test(t)) return { app: "instagram", category: "app" };
  if (/snap ?chat/.test(t)) return { app: "snapchat", category: "app" };
  if (/whats? ?app/.test(t)) return { app: "whatsapp", category: "app" };
  if (/you ?tube/.test(t)) return { app: "youtube", category: "app" };
  if (/gmail|email|e-?mail/.test(t)) return { app: "gmail", category: "app" };
  if (/facebook|\bfb\b/.test(t)) return { app: "facebook", category: "app" };
  if (/chrome|browser|google search/.test(t)) return { app: "chrome", category: "app" };
  if (/excel|spreadsheet/.test(t)) return { app: "excel", category: "software" };
  if (/\bword\b|microsoft word/.test(t)) return { app: "word", category: "software" };
  if (/google\s?docs|google\s?docs?/.test(t)) return { app: "google-docs", category: "software" };
  if (/pay ?tm|paytm/.test(t)) return { app: "paytm", category: "app" };
  if (/google ?pay|gpay/.test(t)) return { app: "gpay", category: "app" };
  if (/phone ?pe/.test(t)) return { app: "phonepe", category: "app" };
  if (/zoom/.test(t)) return { app: "zoom", category: "app" };
  if (/telegram/.test(t)) return { app: "telegram", category: "app" };
  if (/twitter|\bx\b|\bex\b/.test(t)) return { app: "twitter", category: "app" };
  if (/health|exercise|walk|medicine|doctor|diet|yoga/.test(t)) return { app: "general", category: "health" };
  if (/cook|recipe|food|kitchen/.test(t)) return { app: "general", category: "life-skill" };
  return { app: "general", category: "other" };
}

export async function generateTutorial(topic: string): Promise<GeneratedTutorial> {
  const trimmed = topic.trim() || "How to use a smartphone";
  if (!openai) return offlineTutorial(trimmed);

  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TUTORIAL_PROMPT },
        {
          role: "user",
          content: `Create a detailed, customized 10-slide tutorial for a senior citizen about: ${trimmed}. The user wants real, specific, expert-quality instructions tailored exactly to this topic — not a generic answer. Be specific to the topic at every step (e.g. for "Instagram", name real Instagram features like Reels, Stories, DMs, Explore page; for "Snapchat", name real Snapchat features like Lenses, Snaps, Snap Map, Memories; for "Excel", name real features like cells, formulas, SUM, charts). Include a 3-5 question multiple-choice quiz at the end. Use the same language as the topic. Use the JSON shape: {"app": string, "category": string, "tags": [string], "intro": string, "steps": [{"title": string, "description": string, "tip"?: string}], "success": string, "quiz": [{"question": string, "options": [string,string,string,string], "correctIndex": 0-3, "explanation": string}]}.`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = safeJson<Partial<GeneratedTutorial>>(raw, {});
    const fallbackKey = detectAppKey(trimmed);
    const app = (parsed.app as string) || fallbackKey.app;
    const category = (parsed.category as string) || fallbackKey.category;
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.slice(0, 6).map((t) => String(t))
      : [];
    const intro = parsed.intro || `Here is a custom guide about ${trimmed}. Follow each step slowly.`;
    const steps = Array.isArray(parsed.steps) && parsed.steps.length >= 5
      ? parsed.steps.slice(0, 12).map((s) => ({
          title: String(s?.title || "Step"),
          description: String(s?.description || ""),
          tip: s?.tip ? String(s.tip) : undefined,
        }))
      : Array.isArray(parsed.steps) && parsed.steps.length > 0
        ? padTutorialSteps(parsed.steps.slice(0, 4).map((s) => ({
            title: String(s?.title || "Step"),
            description: String(s?.description || ""),
            tip: s?.tip ? String(s.tip) : undefined,
          })), trimmed, 10)
        : offlineTutorial(trimmed).steps;
    const success = parsed.success || "Great job! You completed the tutorial.";
    const quiz = Array.isArray(parsed.quiz)
      ? parsed.quiz
          .slice(0, 6)
          .map((q) => ({
            question: String(q?.question || ""),
            options: Array.isArray(q?.options)
              ? q.options.slice(0, 4).map((o) => String(o))
              : [],
            correctIndex: Number.isInteger(q?.correctIndex) ? Number(q.correctIndex) : 0,
            explanation: q?.explanation ? String(q.explanation) : undefined,
          }))
          .filter((q) => q.question && q.options.length >= 2)
      : [];
    return { app, category, tags, intro, steps, success, quiz };
  } catch (err) {
    console.error("[ai] tutorial generation failed, falling back to offline template:", err);
    return offlineTutorial(trimmed);
  }
}

function padTutorialSteps(
  base: TutorialSlide[],
  topic: string,
  targetCount: number,
): TutorialSlide[] {
  if (base.length >= targetCount) return base;
  const fillers: TutorialSlide[] = [
    {
      title: "Take it slow",
      description: `There is no rush while you learn about ${topic}. Read each step twice before you tap anything on the screen.`,
      tip: "If you get stuck, take a deep breath and try the step again.",
    },
    {
      title: "Use the back button",
      description: `If you tapped the wrong thing while learning about ${topic}, look for the small back arrow at the top of the screen and tap it.`,
    },
    {
      title: "Ask a helper",
      description: `If something about ${topic} does not work the way this guide says, ask a family member or friend to sit with you and look at the screen together.`,
    },
    {
      title: "Practice once more",
      description: `Try the steps for ${topic} one more time from the top. The second time always feels easier.`,
    },
    {
      title: "Save this tutorial",
      description: `Tap the heart or save button so you can come back to this ${topic} guide later whenever you forget.`,
    },
    {
      title: "Stay safe online",
      description: `Never share your password, OTP, or bank PIN with anyone, even if they say they are calling from customer support.`,
    },
    {
      title: "Great work",
      description: `You finished the ${topic} guide. Be proud of yourself and try it again tomorrow to remember it well.`,
    },
  ];
  const out = [...base];
  let i = 0;
  while (out.length < targetCount && i < fillers.length) {
    out.push(fillers[i]);
    i += 1;
  }
  return out;
}

function offlineTutorial(topic: string): GeneratedTutorial {
  const key = detectAppKey(topic);
  const t = topic.trim() || "How to use a smartphone";
  const intro = `Here is a simple, friendly guide about "${t}". We will go step by step so you can do it yourself, even if you have never used it before. Take your time.`;

  // App-specific slide content for the most common off-the-shelf apps — gives the
  // user genuinely useful steps even when the live LLM is offline.
  const appSteps: Record<string, TutorialSlide[]> = {
    instagram: [
      { title: "Open Instagram", description: "Find the pink-and-orange camera icon on your home screen and tap it once to open the app.", tip: "If asked, sign in with your email and password." },
      { title: "Look at the home feed", description: "You will see photos and short videos from people you follow. Swipe up to see older posts, swipe down to refresh." },
      { title: "Like a post", description: "Tap the small heart below any photo to say you like it. Tap again to remove the like." },
      { title: "Leave a comment", description: "Tap the speech-bubble icon under a post, type your message, and tap Post." },
      { title: "Follow a friend", description: "Tap Search (magnifying glass) at the bottom, type the friend's name, then tap Follow next to their profile." },
      { title: "Post your own photo", description: "Tap the plus (+) icon at the top, choose a photo from your gallery or take a new one, add a short caption, and tap Share." },
      { title: "Try Reels", description: "Tap the movie clapper icon at the bottom to watch short fun videos. Swipe up for the next one." },
      { title: "Send a Direct Message", description: "Tap the paper-airplane icon at the top-right, pick a friend, type a message, and tap Send." },
      { title: "Make your account private", description: "Tap your profile picture, then the three lines (☰) top-right, then Settings → Privacy, and switch Account to Private." },
      { title: "Stay safe on Instagram", description: "Never share your password or OTP with anyone, even if a message says it is from Instagram support." },
    ],
    snapchat: [
      { title: "Open Snapchat", description: "Find the yellow ghost icon on your home screen and tap it. If it asks, allow camera and microphone access." },
      { title: "Take a Snap", description: "The camera opens first. Point it at what you want to photograph, then tap the big round button at the bottom to capture." },
      { title: "Use a Lens (filter)", description: "Tap and hold on your face in the camera. A row of funny lenses will appear. Swipe left or right to try them, then tap the capture button." },
      { title: "Add text or a drawing", description: "After taking a Snap, tap the T (text) to add words, or the pencil to draw with your finger." },
      { title: "Send the Snap", description: "Tap the blue arrow at the bottom-right, pick a friend, and tap it again to send. The Snap disappears after they see it." },
      { title: "Open a Snap from a friend", description: "Swipe right on the camera screen to open Chat. Tap a friend's name to see the Snaps they sent you. Tap once to view, tap again to skip." },
      { title: "Post to your Story", description: "After taking a Snap, tap the square-with-plus icon at the bottom-left to add it to your Story for 24 hours." },
      { title: "Use Snap Map", description: "Pinch the camera screen with two fingers to see where your friends are (only if they chose to share). The yellow action figure is you." },
      { title: "Save Snaps to Memories", description: "Tap the small down-arrow below the capture button to save a Snap to Memories so you can see it again later." },
      { title: "Stay safe on Snapchat", description: "Only add people you know in real life. Never share personal details or photos with strangers." },
    ],
    whatsapp: [
      { title: "Open WhatsApp", description: "Find the green icon with a white phone inside a speech bubble and tap it." },
      { title: "See your chats", description: "The Chats tab is the main screen. Each row is one person or group. The latest message is shown on the right." },
      { title: "Start a new chat", description: "Tap the green-and-white new-chat icon at the bottom-right. Pick a contact from the list, then start typing." },
      { title: "Send a text message", description: "Tap the text box at the bottom, type your message, and tap the green paper-airplane to send." },
      { title: "Send a photo or video", description: "Tap the camera (or +) icon next to the text box. Choose a photo from your gallery, or tap the camera icon to take a new one." },
      { title: "Make a voice or video call", description: "Open any chat, then tap the phone icon for a voice call or the camera icon for a video call." },
      { title: "Send a voice note", description: "Tap and hold the microphone icon next to the text box. Speak your message, then slide up to send it." },
      { title: "Create a group", description: "Tap the three dots (⋮) at the top, then New group. Pick the people you want, give the group a name, and tap the green checkmark." },
      { title: "Use WhatsApp Web on a computer", description: "Open web.whatsapp.com in Chrome, then on your phone go to Settings → Linked Devices → Link a Device, and scan the QR code on the computer." },
      { title: "Stay safe on WhatsApp", description: "Never share your 6-digit login code with anyone — not even family. Real WhatsApp staff will never ask for it." },
    ],
    youtube: [
      { title: "Open YouTube", description: "Find the red play-button icon on your home screen and tap it." },
      { title: "Browse the home feed", description: "The main screen shows videos YouTube thinks you may like. Scroll down to see more, tap any thumbnail to start watching." },
      { title: "Search for a video", description: "Tap the magnifying glass at the top, type what you want to watch (like 'Gandhi biography'), then tap Search on the keyboard." },
      { title: "Use the video player", description: "Tap the screen once to show the controls. Tap the gear icon to change quality (lower quality uses less data)." },
      { title: "Subscribe to a channel", description: "When you find a channel you like, tap the red Subscribe button under any of their videos. Their new uploads will show up on your home feed." },
      { title: "Like, dislike, and comment", description: "Below the video, tap the thumbs-up to like, the thumbs-down to dislike, or the comment box to share your thoughts." },
      { title: "Save a video for later", description: "Tap 'Save' (a bookmark icon) below the video. To find it again, tap Library at the bottom-right." },
      { title: "Turn on captions", description: "Tap the CC button in the video player. This shows the words on the screen — great if the speaker is hard to hear." },
      { title: "Watch on TV", description: "Tap the cast icon (a rectangle with Wi-Fi waves) at the top of the app, pick your TV, and your video will play on the big screen." },
      { title: "Stay safe on YouTube", description: "If a video promises free money, miracle cures, or scary news, close it. Talk to a family member before you click." },
    ],
    gmail: [
      { title: "Open Gmail", description: "Find the envelope-shaped icon with a red 'M' and tap it. Sign in with your Google email and password." },
      { title: "Read an email", description: "Tap any email in the list to open it. The newest emails are at the top. The orange dot means it is unread." },
      { title: "Reply to an email", description: "Open the email, tap Reply (a curved arrow), type your message, and tap the blue paper-airplane Send button." },
      { title: "Write a new email", description: "Tap Compose (the colorful plus or pencil icon) at the bottom-right. Fill in To, Subject, and your message, then tap Send." },
      { title: "Add an attachment", description: "Inside a Compose window, tap the paperclip icon. Pick a photo, file, or document from your phone to send it." },
      { title: "Use Search", description: "Tap the magnifying glass at the top and type a name or a word from the email you are looking for." },
      { title: "Mark important emails", description: "Swipe an email to the right (or tap the star next to it) to keep it starred. Starred emails are easy to find in the Starred label." },
      { title: "Delete and archive", description: "Tap the trash can to delete, or the archive box to remove an email from your inbox but keep it for later." },
      { title: "Spot a scam email", description: "Real banks never ask for your PIN or password by email. If a message feels urgent or scary, delete it and call your bank." },
      { title: "Sign out safely", description: "Tap your profile picture at the top-right, then Manage your Google Account → Security → Sign out, especially on a shared phone." },
    ],
  };

  const specific = appSteps[key.app];
  const steps: TutorialSlide[] = specific
    ? specific
    : [
        { title: "Get comfortable", description: `Sit down, charge your phone, and put on your reading glasses. We will go through ${t} one slow step at a time.`, tip: "There is no rush. You can take a break between any two steps." },
        { title: "Open what you need", description: `Find the app, website, or page for ${t} and open it. If you cannot find it, ask a helper to pin it to your home screen.` },
        { title: "Look at the screen", description: `Before you tap anything, look at the buttons on the screen. Most have a label and a small picture that shows what they do.` },
        { title: "Take the first action", description: `Start with the very first thing this guide says to do. Read it twice, then try it. If it does not work, stop and re-read.` },
        { title: "If you make a mistake", description: `Most apps have a back arrow at the top-left. Tap it to go back one step. You can almost always undo a wrong tap.` },
        { title: "Save your progress", description: `If the app asks if you want to save, always tap Yes. This keeps your work safe if your phone battery dies.` },
        { title: "Try a second time", description: `Do the whole flow for ${t} one more time from the top. The second time is always easier than the first.` },
        { title: "When you are done", description: `Tap the Home button to leave the app. Your work is saved. You can come back any time.` },
        { title: "Common problems", description: `If something looks frozen, wait 10 seconds. If it is still stuck, close the app and open it again from the home screen.` },
        { title: "Ask for help when you need it", description: `There is no shame in asking a family member or friend to sit with you. They will be proud that you are learning.` },
      ];

  return {
    app: key.app,
    category: key.category,
    tags: [key.app, key.category, "offline-guide"],
    intro,
    steps,
    success: `Wonderful! You finished the ${t} guide. Try it once more on your own tomorrow to remember it well.`,
    quiz: [
      {
        question: `What is the very first step of "${t}"?`,
        options: [
          steps[0].title,
          "Throw the phone away",
          "Call a friend randomly",
          "Turn off the Wi-Fi",
        ],
        correctIndex: 0,
        explanation: `Starting calmly with "${steps[0].title}" sets you up for success.`,
      },
      {
        question: "If you tap the wrong button by mistake, what should you do?",
        options: ["Tap it again", "Look for a back arrow at the top-left", "Restart the phone", "Throw the phone"],
        correctIndex: 1,
        explanation: "The back arrow undoes most mistakes safely.",
      },
      {
        question: "Why is it good to repeat the steps a second time?",
        options: ["It is not — once is enough", "It helps you remember and feel confident", "It uses up your battery", "It will break the app"],
        correctIndex: 1,
        explanation: "Repeating helps your fingers and brain remember the steps for next time.",
      },
    ],
  };
}

export async function chatWithTutor(
  message: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<string> {
  if (!openai) return offlineChatReply(message);
  try {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-12),
      { role: "user", content: message },
    ];
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.5,
      messages,
    });
    return (
      completion.choices[0]?.message?.content?.trim() ||
      offlineChatReply(message)
    );
  } catch (err) {
    console.error("[ai] chat failed, falling back to offline response:", err);
    return offlineChatReply(message);
  }
}

function offlineChatReply(message: string): string {
  const m = message.toLowerCase();
  if (/(whatsapp|message|text)/.test(m)) {
    return "To send a WhatsApp message:\n1. Open WhatsApp.\n2. Tap the person you want to message.\n3. Type at the bottom.\n4. Tap the paper-airplane send button.";
  }
  if (/(youtube|video)/.test(m)) {
    return "To watch a YouTube video:\n1. Open YouTube.\n2. Tap the search icon (magnifying glass) at the top.\n3. Type what you want to watch.\n4. Tap the video you like.";
  }
  if (/(email|gmail|mail)/.test(m)) {
    return "To send an email:\n1. Open Gmail.\n2. Tap Compose (it looks like a pencil).\n3. Type the address, subject, and message.\n4. Tap Send.";
  }
  if (/(password|login|sign in)/.test(m)) {
    return "To sign in:\n1. Open the app or website.\n2. Tap Sign In.\n3. Enter your email and password.\n4. Tap Sign In.\n\nIf you forgot your password, tap 'Forgot password' and follow the steps in your email.";
  }
  if (/(scam|fraud|safe|safety|otp|bank|fishing|phishing)/.test(m)) {
    return "Safety tip: never share your password, OTP, or bank details over the phone or in a message — even if the person says they are from your bank. Real banks never ask for OTPs. If unsure, hang up and call the number printed on the back of your card.";
  }
  if (/(medicine|tablet|pill|medication|prescription)/.test(m)) {
    return "For medicines:\n1. Take them at the same time every day.\n2. Use a pill box with the days of the week.\n3. Never stop a prescription without asking your doctor.\n4. If you forget a dose, call your doctor — do not double up.";
  }
  if (/(health|exercise|walk|heart|diabetes|blood pressure|bp)/.test(m)) {
    return "For healthy living:\n- Walk for 20-30 minutes every day, even slowly.\n- Drink 6-8 glasses of water a day.\n- Sleep 7-8 hours each night.\n- Visit your doctor for a check-up every 6 months.";
  }
  if (/(math|maths|add|subtract|multiply|divide|equation|percentage|fraction)/.test(m)) {
    return "I can help with basic math when the live AI is connected. In the meantime, a calculator app on your phone can solve most problems quickly — tap the calculator icon, enter the numbers, and press =.";
  }
  if (/(history|war|king|queen|empire|independence)/.test(m)) {
    return "History questions are best answered by the live AI tutor. Once a Groq or OpenAI key is added to the .env file, I can explain any historical event in simple language with dates and context.";
  }
  if (/(science|physics|chemistry|biology|space|planet|gravity)/.test(m)) {
    return "Science questions are best answered by the live AI tutor. With a free Groq key in the .env file, I can explain any science topic step by step in everyday language.";
  }
  if (/(cook|recipe|food|kitchen|ingredient|dish)/.test(m)) {
    return "For a recipe:\n1. Read the full recipe first.\n2. Gather all ingredients before you start.\n3. Wash your hands and the vegetables.\n4. Follow the steps in order and turn off the stove when done.\n\nTell me the dish name and I will give exact steps once the live AI is connected.";
  }
  if (/(government|aadhaar|pan|ration|pension|passport)/.test(m)) {
    return "For Indian government services, the official portals are best:\n- Aadhaar: uidai.gov.in\n- PAN: incometax.gov.in\n- Passport: passportindia.gov.in\n\nNever share your OTPs or full Aadhaar number with strangers, even on the phone.";
  }
  if (/(hello|hi|hey|namaste|good (morning|afternoon|evening))/.test(m)) {
    return "Hello! I am your AI tutor. You can ask me about anything — phones, health, medicines, science, history, cooking, government services, daily life, or any doubt you have. What would you like to know?";
  }
  return "I am happy to help with almost any question — phones, health, science, history, math, cooking, government services, daily life, or anything you are curious about. Right now I am running in offline mode (no API key set), so my answers are simple. To unlock the full AI tutor, get a free Groq key at https://console.groq.com and add it to your .env file as GROQ_API_KEY.";
}

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string | null> {
  if (!openai) return null;
  try {
    const file = new File([new Uint8Array(buffer)], filename, { type: "audio/webm" });
    const res = await openai.audio.transcriptions.create({
      file,
      model: TRANSCRIBE_MODEL,
    });
    return res.text;
  } catch (err) {
    console.error("[ai] transcription failed:", err);
    return null;
  }
}

export async function synthesizeSpeech(text: string, voice?: string): Promise<Buffer | null> {
  if (!openai) return null;
  try {
    const res = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: (voice as any) || TTS_VOICE,
      input: text,
    });
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error("[ai] tts failed:", err);
    return null;
  }
}
