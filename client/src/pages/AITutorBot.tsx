import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Volume2, ArrowLeft, User, Save, History, Sparkles, ArrowRight, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSpeak } from "@/lib/speech";
import { useAuth } from "@/contexts/AuthContext";
import aiAssistantIcon from "@assets/generated_images/friendly_ai_assistant_icon.png";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tutorialCard?: {
    id: string | null;
    topic: string;
    app?: string | null;
    stepsCount: number;
    quizCount: number;
    intro: string;
  };
};

// Patterns that signal the user wants a tutorial, not just a chat reply.
const TUTORIAL_TRIGGERS = [
  /\bteach me\b/i,
  /\bhow (do|to|can) (i|you|we)\b/i,
  /\bhow (does|to use)\b/i,
  /\bshow me how\b/i,
  /\bi want to learn\b/i,
  /\bi('| wi)sh to learn\b/i,
  /\bgive me (a )?tutorial\b/i,
  /\bgive me (a )?guide\b/i,
  /\bmake (me )?(a )?tutorial\b/i,
  /\bcreate (a )?tutorial\b/i,
  /\bstep[- ]by[- ]step\b/i,
  /\blearn\b.{0,40}\b(app|app|tutorial|guide)\b/i,
  /\bhow to\b/i,
  /\btutorial on\b/i,
  /\bguide me\b/i,
];

function looksLikeTutorialRequest(text: string): boolean {
  return TUTORIAL_TRIGGERS.some((re) => re.test(text));
}

function extractTopicFromRequest(text: string): string {
  // Try to pull the topic out of the sentence. Fallback: use the whole text.
  const patterns: RegExp[] = [
    /teach me (about |how to )?(.+?)(?:\.|$|please|thanks|thank you)/i,
    /how (do|to) (i |you |we )?(use |make |set up |do |play )?(.+?)(?:\?|$|please|thanks|thank you)/i,
    /i want to learn (.+?)(?:\.|$|please|thanks|thank you)/i,
    /tutorial (on|about) (.+?)(?:\?|$|please|thanks|thank you)/i,
    /guide (for|on|about) (.+?)(?:\?|$|please|thanks|thank you)/i,
    /step[- ]by[- ]step (guide|tutorial|how to|on) (.+?)(?:\?|$|please|thanks|thank you)/i,
    /how to (.+?)(?:\?|$|please|thanks|thank you)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      // Use the last captured group
      const topic = (m[m.length - 1] || "").trim();
      if (topic && topic.length >= 2 && topic.length <= 80) return topic;
    }
  }
  return text.trim().replace(/[?.!]+$/, "");
}

const THINKING_PHASE_KEYS = [
  "aiTutor.thinking.reading",
  "aiTutor.thinking.deep",
  "aiTutor.thinking.writing",
  "aiTutor.thinking.almost",
];

export default function AITutorBot() {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const speak = useSpeak();
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: t("aiTutor.greeting"),
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("New Learning Session");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [thinkingPhase, setThinkingPhase] = useState(0);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [pendingQuestion, setPendingQuestion] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const LANG_TO_BCP47: Record<string, string> = { en: "en-US", te: "te-IN", hi: "hi-IN" };

  // Auto-scroll only when messages change
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
  }, [messages.length]);

  // Drive the rotating "thinking" phrases + elapsed seconds while loading.
  useEffect(() => {
    if (!isLoading) {
      setThinkingPhase(0);
      setThinkingSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const tick = setInterval(() => {
      setThinkingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    const rotate = setInterval(() => {
      setThinkingPhase((p) => (p + 1) % THINKING_PHASE_KEYS.length);
    }, 1800);
    return () => {
      clearInterval(tick);
      clearInterval(rotate);
    };
  }, [isLoading]);

  // Lazy-load speech recognition on first use
  const initializeSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) return;

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = LANG_TO_BCP47[language] || "en-US";

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          alert("Microphone permission denied. Please allow microphone access in your browser settings.");
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognitionInstance;
    }
  }, [language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Recognition may already be stopped
        }
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputValue;
    setInputValue("");
    setPendingQuestion(messageToSend);
    setIsLoading(true);

    // If the user is asking for a tutorial, generate one in the background
    // and also save it to "Recent AI Tutorials" if they're signed in.
    let tutorialCard: Message["tutorialCard"] | undefined;
    if (looksLikeTutorialRequest(messageToSend)) {
      try {
        const topic = extractTopicFromRequest(messageToSend);
        const endpoint = isAuthenticated
          ? "/api/tutorials/ai"
          : "/api/tutorials/generate";
        const tutRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ topic }),
        });
        if (tutRes.ok) {
          const tutData = await tutRes.json();
          const t = tutData.tutorial;
          tutorialCard = {
            id: t?.id ?? null,
            topic: t?.topic ?? topic,
            app: t?.app ?? null,
            stepsCount: Array.isArray(t?.steps) ? t.steps.length : 0,
            quizCount: Array.isArray(t?.quiz) ? t.quiz.length : 0,
            intro: t?.intro ?? "",
          };
        }
      } catch (err) {
        console.error("Tutorial pre-generation failed:", err);
      }
    }

    try {
      // Filter out timestamp and create conversation history
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get AI response (${response.status})`);
      }

      const data = await response.json();
      const aiMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        tutorialCard,
      };
      setMessages((prev) => [...prev, aiMessage]);
      if (isVoiceEnabled && data.response) {
        handleTextToSpeech(data.response);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: t("aiTutor.networkError"),
        timestamp: new Date(),
        tutorialCard,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setPendingQuestion("");
    }
  }, [inputValue, isLoading, messages, isVoiceEnabled, t, isAuthenticated]);

  const handleVoice = useCallback(() => {
    // Don't allow voice input if mic is disabled
    if (!isMicEnabled) {
      alert("Microphone is currently disabled. Please enable it in the header to use voice input.");
      return;
    }

    // Initialize on first use
    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }

    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.error("Error stopping recognition:", e);
        setIsListening(false);
      }
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting recognition:", e);
        alert("Could not start voice recognition. Please make sure microphone permissions are granted.");
      }
    }
  }, [isListening, isMicEnabled, initializeSpeechRecognition]);

  const handleTextToSpeech = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = LANG_TO_BCP47[language] || "en-US";
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) =>
        v.lang?.toLowerCase().startsWith((LANG_TO_BCP47[language] || "en-US").toLowerCase()),
      );
      if (match) utterance.voice = match;
      window.speechSynthesis.speak(utterance);
    },
    [language],
  );

  const saveConversation = useCallback(async () => {
    if (messages.length <= 1) {
      alert("Please have a conversation first before saving!");
      return;
    }

    setIsSaving(true);
    try {
      const topic = messages.length > 1 ? messages[1].content.substring(0, 50) : "Learning";
      
      if (conversationId) {
        // Update existing conversation
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: conversationTitle,
            topic,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (response.ok) {
          alert("Conversation updated!");
        } else if (response.status === 401) {
          alert("Please sign in to save conversations.");
        }
      } else {
        // Create new conversation
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: conversationTitle,
            topic,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setConversationId(data.id);
          alert("Conversation saved successfully!");
        } else if (response.status === 401) {
          alert("Please sign in to save conversations.");
        }
      }
    } catch (error) {
      console.error("Error saving conversation:", error);
      alert("Failed to save conversation");
    } finally {
      setIsSaving(false);
    }
  }, [messages, conversationId, conversationTitle]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="lg"
              className="text-lg"
              onClick={() => setLocation("/guest")}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t("nav.back")}
            </Button>
            <h1 className="text-3xl font-bold">{t("guest.chatAssistant")}</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setLocation("/conversation-history")}
                data-testid="button-history"
                className="h-12 px-6 text-lg"
              >
                <History className="mr-2 h-5 w-5" />
                {t("dashboard.learningProgress")}
              </Button>
              <Button
                variant={isMicEnabled ? "default" : "outline"}
                size="lg"
                onClick={() => setIsMicEnabled(!isMicEnabled)}
                data-testid="button-toggle-mic"
                title={isMicEnabled ? "Microphone is ON" : "Microphone is OFF"}
                className="h-12 px-6 text-lg"
              >
                <Mic className="mr-2 h-5 w-5" />
                {isMicEnabled ? "Mic ON" : "Mic OFF"}
              </Button>
              <Button
                variant={isVoiceEnabled ? "default" : "outline"}
                size="lg"
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                data-testid="button-toggle-voice"
                title={isVoiceEnabled ? "AI Speech is ON" : "AI Speech is OFF"}
                className="h-12 px-6 text-lg"
              >
                <Volume2 className="mr-2 h-5 w-5" />
                {isVoiceEnabled ? "Speech ON" : "Speech OFF"}
              </Button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              value={conversationTitle}
              onChange={(e) => setConversationTitle(e.target.value)}
              placeholder="Session title"
              className="text-lg py-2"
              data-testid="input-title"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={saveConversation}
              disabled={isSaving}
              data-testid="button-save"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-6 py-8 max-w-4xl flex flex-col">
        <ScrollArea className="flex-1 pr-4 mb-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.role}-${index}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-14 w-14 flex-shrink-0">
                    <AvatarImage src={aiAssistantIcon} alt="AI Tutor" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`flex flex-col max-w-[80%] ${message.role === "user" ? "items-end" : "items-start"}`}
                >
                  <Card
                    className={`p-6 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <p className="text-lg leading-relaxed">{message.content}</p>
                  </Card>
                  {message.role === "assistant" && message.tutorialCard && (
                    <Card
                      className="mt-3 p-5 border-2 border-primary w-full"
                      data-testid={`tutorial-card-${index}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <p className="text-base font-semibold">AI Tutorial ready</p>
                      </div>
                      <p className="text-xl font-bold mb-1">{message.tutorialCard.topic}</p>
                      <div className="flex gap-2 flex-wrap mb-2">
                        <Badge variant="default">{message.tutorialCard.stepsCount} slides</Badge>
                        {message.tutorialCard.quizCount > 0 && (
                          <Badge variant="secondary">{message.tutorialCard.quizCount} quiz</Badge>
                        )}
                        {message.tutorialCard.app && message.tutorialCard.app !== "general" && (
                          <Badge variant="outline" className="capitalize">{message.tutorialCard.app}</Badge>
                        )}
                      </div>
                      {message.tutorialCard.intro && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {message.tutorialCard.intro}
                        </p>
                      )}
                      <Button
                        size="sm"
                        onClick={() => {
                          if (message.tutorialCard?.id) {
                            setLocation(`/tutorial/ai/${message.tutorialCard.id}`);
                          } else {
                            // For guest mode (no id), send them to the learning page to generate
                            setLocation("/learning");
                          }
                        }}
                        data-testid={`button-open-tutorial-card-${index}`}
                      >
                        Open tutorial <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      {message.tutorialCard.id && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Saved to your Recent AI Tutorials on the dashboard.
                        </p>
                      )}
                    </Card>
                  )}
                  {message.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleTextToSpeech(message.content)}
                      data-testid={`button-speak-${index}`}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      Read Aloud
                    </Button>
                  )}
                </div>
                {message.role === "user" && (
                  <Avatar className="h-14 w-14 flex-shrink-0">
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-4">
          {isListening && (
            <Card className="border-2 border-primary bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <Mic className="h-6 w-6 text-primary animate-pulse" />
                <Badge className="text-base px-4 py-2">Listening... Speak now!</Badge>
              </div>
            </Card>
          )}

          {isSpeaking && (
            <Card className="border-2 border-secondary bg-secondary/5 p-4">
              <div className="flex items-center gap-3">
                <Volume2 className="h-6 w-6 text-secondary animate-pulse" />
                <Badge className="text-base px-4 py-2 bg-secondary text-secondary-foreground">
                  AI is speaking...
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  }}
                  data-testid="button-stop-speaking"
                >
                  Stop
                </Button>
              </div>
            </Card>
          )}

          {isLoading && (
            <Card
              className="border-2 border-primary bg-primary/5 p-5"
              data-testid="card-thinking"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="text-base px-3 py-1">
                      {t(THINKING_PHASE_KEYS[thinkingPhase])}
                    </Badge>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {thinkingSeconds}s
                    </span>
                    <div className="flex gap-1 ml-1">
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </div>
                  </div>
                  {pendingQuestion && (
                    <p className="text-sm text-muted-foreground italic line-clamp-2">
                      {t("aiTutor.thinking.about")}: "{pendingQuestion}"
                    </p>
                  )}
                  {thinkingSeconds >= 8 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("aiTutor.thinking.longer")}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              size="icon"
              variant={isListening ? "default" : isMicEnabled ? "outline" : "ghost"}
              className="h-14 w-14 flex-shrink-0"
              onClick={handleVoice}
              disabled={!isMicEnabled || isLoading}
              data-testid="button-voice"
              title={isMicEnabled ? "Click to use voice input" : "Microphone is disabled"}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            <Input
              placeholder={isLoading ? t("aiTutor.thinking.deep") : t("aiTutor.placeholder")}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="h-14 text-lg flex-1"
              disabled={isLoading}
              data-testid="input-message"
            />
            <Button
              size="icon"
              className="h-14 w-14 flex-shrink-0"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              data-testid="button-send"
            >
              <Send className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
