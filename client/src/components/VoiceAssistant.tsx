import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, X, Loader2, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListenOnce, useSpeak } from "@/lib/speech";
import { cn } from "@/lib/utils";

type IntentName =
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

type IntentResult = {
  intent: IntentName;
  title: string;
  params: {
    text?: string;
    time?: string;
    duration?: string;
    topic?: string;
    app?: string;
    step?: string | number;
    which?: string;
  };
  reply: string;
};

const APP_TO_ROUTE: Record<string, string> = {
  whatsapp: "whatsapp",
  youtube: "youtube",
  email: "email",
  facebook: "facebook",
  chrome: "chrome",
};

const ACTIONABLE_INTENTS = new Set<IntentName>([
  "add_reminder",
  "add_medication",
  "add_alarm",
  "set_timer",
  "add_water",
  "log_water",
  "delete_reminder",
  "mark_step_complete",
  "read_progress",
  "read_health",
  "read_steps",
]);

export default function VoiceAssistant() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const speak = useSpeak();
  const listen = useListenOnce();

  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (open && isAuthenticated) {
      const greeting =
        "Hi! I am your voice assistant. Tell me things like 'add a reminder to call my daughter at 6 PM', 'set a timer for 10 minutes', 'mark this step as done', 'log a glass of water', or 'open the WhatsApp tutorial'.";
      setReply(greeting);
      speak(greeting);
    }
  }, [open, isAuthenticated, speak]);

  async function handleListen() {
    if (listening) {
      abortRef.current = true;
      setListening(false);
      return;
    }
    abortRef.current = false;
    setError(null);
    setTranscript("");
    setReply(null);
    setListening(true);
    try {
      const text = await listen();
      if (abortRef.current) return;
      setListening(false);
      setTranscript(text);
      if (!text.trim()) {
        const m = "I did not hear anything. Please try again.";
        setReply(m);
        speak(m);
        return;
      }
      await runIntent(text);
    } catch (err) {
      setListening(false);
      const message = err instanceof Error ? err.message : "Voice failed";
      setError(message);
      speak("Sorry, I could not understand the audio. Please try again.");
    }
  }

  async function runIntent(text: string) {
    setThinking(true);
    try {
      const res = await fetch("/api/voice/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transcript: text }),
      });
      if (!res.ok) {
        const m = "I am having trouble reaching the assistant right now.";
        setReply(m);
        speak(m);
        return;
      }
      const data = (await res.json()) as { intent: IntentResult };
      const intent = data.intent;
      setReply(intent.reply);
      speak(intent.reply);
      await handleIntent(intent);
    } catch (err) {
      console.error(err);
      const m = "Sorry, something went wrong. Please try again.";
      setReply(m);
      speak(m);
    } finally {
      setThinking(false);
    }
  }

  async function handleIntent(intent: IntentResult) {
    if (ACTIONABLE_INTENTS.has(intent.intent)) {
      try {
        const res = await fetch("/api/voice/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ intent }),
        });
        if (res.ok) {
          const data = await res.json();
          if (intent.intent === "mark_step_complete" && data.ok) {
            const followUp = data.ok
              ? `Step ${data.stepIndex + 1} marked done. You have completed ${data.stepIndex + 1} of ${data.tutorial?.steps?.length || "?"} steps.`
              : "All steps in this tutorial are already complete.";
            setReply(followUp);
            speak(followUp);
            return;
          }
          if (intent.intent === "read_progress" && data.ok) {
            const summary =
              data.progress && data.progress.length > 0
                ? `You have ${data.progress.length} saved tutorials. Say 'open learning' to see them.`
                : "You have no saved tutorials yet. Say 'teach me how to take a screenshot' to start one.";
            setReply(summary);
            speak(summary);
            return;
          }
        }
      } catch (err) {
        console.error("voice action error", err);
      }
    }

    if (intent.intent === "open_tutorial") {
      const app = intent.params.app;
      if (app && APP_TO_ROUTE[app]) {
        setLocation(`/tutorial/${APP_TO_ROUTE[app]}`);
      } else if (intent.params.topic) {
        const topic = intent.params.topic;
        setReply(`Creating a fresh AI tutorial on ${topic} for you.`);
        speak(`Creating a fresh AI tutorial on ${topic} for you.`);
        const r = await fetch("/api/tutorials/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ topic }),
        });
        if (r.ok) {
          const data = await r.json();
          setLocation(`/tutorial/ai/${data.tutorial.id}`);
        } else {
          setLocation("/learning");
        }
      } else {
        setLocation("/learning");
      }
      setOpen(false);
      return;
    }
    if (intent.intent === "open_dashboard") {
      setLocation(isAuthenticated ? "/dashboard" : "/auth");
      setOpen(false);
      return;
    }
    if (intent.intent === "open_smartwatch") {
      setLocation("/smartwatch");
      setOpen(false);
      return;
    }
    if (intent.intent === "open_learning") {
      setLocation("/learning");
      setOpen(false);
      return;
    }
    if (intent.intent === "open_ai_tutor") {
      setLocation("/ai-tutor");
      setOpen(false);
      return;
    }
    if (intent.intent === "open_privacy") {
      setLocation("/privacy");
      setOpen(false);
      return;
    }
    if (intent.intent === "open_history") {
      setLocation("/conversation-history");
      setOpen(false);
      return;
    }
    if (intent.intent === "read_health" || intent.intent === "read_steps") {
      setLocation("/smartwatch");
      setOpen(false);
      return;
    }
    if (intent.intent === "read_progress") {
      setLocation("/learning");
      setOpen(false);
      return;
    }
    if (intent.intent === "take_quiz") {
      const topic = intent.params.topic || "general knowledge";
      setReply(`Starting an AI quiz on ${topic}.`);
      speak(`Starting an AI quiz on ${topic}.`);
      const r = await fetch("/api/tutorials/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic }),
      });
      if (r.ok) {
        const data = await r.json();
        setLocation(`/tutorial/ai/${data.tutorial.id}?quiz=1`);
      } else {
        setLocation("/learning");
      }
      setOpen(false);
      return;
    }
    if (intent.intent === "stop") {
      setOpen(false);
      return;
    }
  }

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => setLocation("/auth")}
        data-testid="button-voice-signin"
        aria-label="Sign in to use voice assistant"
        className={cn(
          "fixed bottom-24 right-6 z-50 h-16 w-16 rounded-full shadow-xl flex items-center justify-center",
          "bg-gradient-to-br from-gray-500 to-gray-700 text-white",
          "hover:scale-105 active:scale-95 transition-transform",
        )}
      >
        <LogIn className="h-7 w-7" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="button-voice-orb"
        aria-label="Voice assistant"
        className={cn(
          "fixed bottom-24 right-6 z-50 h-16 w-16 rounded-full shadow-xl flex items-center justify-center",
          "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
          "hover:scale-105 active:scale-95 transition-transform",
          open && "ring-4 ring-blue-300/50",
        )}
      >
        {open ? <X className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
      </button>

      {open && (
        <div
          data-testid="voice-assistant-panel"
          className="fixed bottom-44 right-6 z-50 w-[min(420px,90vw)] rounded-2xl border bg-background shadow-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Volume2 className="h-5 w-5" /> Voice Assistant
            </h3>
            <button
              type="button"
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Try: <em>"add medication for blood pressure at 9 am"</em>, <em>"set a timer for 10 minutes"</em>,
            <em> "mark this step as done"</em>, <em>"log a glass of water"</em>, <em>"open WhatsApp tutorial"</em>.
          </p>
          <div className="min-h-[80px] rounded-lg border bg-muted/40 p-3 mb-3 text-base">
            {transcript && (
              <p className="text-muted-foreground">
                <strong>You:</strong> {transcript}
              </p>
            )}
            {reply && (
              <p className="mt-2">
                <strong>Assistant:</strong> {reply}
              </p>
            )}
            {!transcript && !reply && (
              <p className="text-muted-foreground">Tap the mic to speak.</p>
            )}
            {error && <p className="mt-2 text-red-600">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              size="lg"
              onClick={handleListen}
              disabled={thinking}
              className={cn("flex-1", listening && "bg-red-600 hover:bg-red-700")}
              data-testid="button-voice-listen"
            >
              {thinking ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Thinking...
                </>
              ) : listening ? (
                <>
                  <MicOff className="mr-2 h-5 w-5" /> Stop
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" /> Speak
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: works best in Chrome and Edge. Your voice is processed securely.
          </p>
        </div>
      )}
    </>
  );
}
