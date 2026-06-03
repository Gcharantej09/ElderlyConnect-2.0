import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sparkles, Loader2, Trophy, Trash2, ChevronRight, Flame, Calendar } from "lucide-react";
import { SiWhatsapp, SiYoutube, SiGmail, SiFacebook, SiGooglechrome } from "react-icons/si";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import whatsappImage from "@assets/generated_images/whatsapp_messaging_tutorial_illustration.png";
import youtubeImage from "@assets/generated_images/youtube_video_platform_tutorial_illustration.png";
import emailImage from "@assets/generated_images/email_inbox_tutorial_illustration.png";
import facebookImage from "@assets/generated_images/facebook_social_media_tutorial_illustration.png";
import chromeImage from "@assets/generated_images/chrome_browser_web_tutorial_illustration.png";

type SavedAiTutorial = {
  id: string;
  topic: string;
  intro: string;
  steps: { title: string; description: string }[];
  quiz: unknown[];
  score: number | null;
  total: number | null;
  createdAt: string;
  completedAt: string | null;
};

export default function LearningModules() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedAiTutorial[]>([]);
  const [score, setScore] = useState<{ today: number; daily: number; overall: number; streak: number } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      void loadSaved();
      void loadScore();
    }
  }, [isAuthenticated]);

  async function loadSaved() {
    try {
      const res = await fetch("/api/tutorials/ai", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSaved(Array.isArray(data) ? data : []);
      }
    } catch {
      setSaved([]);
    }
  }

  async function loadScore() {
    try {
      const res = await fetch("/api/learning/score", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setScore(data || null);
      }
    } catch {
      setScore(null);
    }
  }

  async function handleGenerate() {
    const clean = topic.trim();
    if (!clean || generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      if (!isAuthenticated) {
        const res = await fetch("/api/tutorials/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: clean }),
        });
        if (!res.ok) {
          setGenError("Could not generate a tutorial right now. Please try again.");
          return;
        }
        const data = await res.json();
        const encoded = encodeURIComponent(JSON.stringify(data.tutorial));
        setLocation(`/tutorial/ai/preview?data=${encoded}`);
        return;
      }
      const res = await fetch("/api/tutorials/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: clean }),
      });
      if (!res.ok) {
        setGenError("Could not generate a tutorial right now. Please try again.");
        return;
      }
      const data = await res.json();
      setLocation(`/tutorial/ai/${data.tutorial.id}`);
    } catch (err) {
      setGenError("Network error. Please check your internet and try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tutorials/ai/${id}`, { method: "DELETE", credentials: "include" });
    setSaved((prev) => prev.filter((p) => p.id !== id));
  }

  const tutorials = [
    {
      icon: SiWhatsapp,
      title: t("learning.whatsapp"),
      description: t("learning.whatsappDesc"),
      lessons: 8,
      duration: "30 min",
      color: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      image: whatsappImage,
      route: "whatsapp",
    },
    {
      icon: SiYoutube,
      title: t("learning.youtube"),
      description: t("learning.youtubeDesc"),
      lessons: 6,
      duration: "25 min",
      color: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      image: youtubeImage,
      route: "youtube",
    },
    {
      icon: SiGmail,
      title: t("learning.email"),
      description: t("learning.emailDesc"),
      lessons: 7,
      duration: "35 min",
      color: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      image: emailImage,
      route: "email",
    },
    {
      icon: SiFacebook,
      title: t("learning.facebook"),
      description: t("learning.facebookDesc"),
      lessons: 7,
      duration: "35 min",
      color: "bg-indigo-100 dark:bg-indigo-900/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      image: facebookImage,
      route: "facebook",
    },
    {
      icon: SiGooglechrome,
      title: t("learning.chrome"),
      description: t("learning.chromeDesc"),
      lessons: 8,
      duration: "40 min",
      color: "bg-yellow-100 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      image: chromeImage,
      route: "chrome",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="lg"
            className="text-lg"
            onClick={() => setLocation("/guest")}
            data-testid="button-back">
            <ArrowLeft className="mr-2 h-5 w-5" />
            {t("nav.back")}
          </Button>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-4">{t("learning.basicCourses")}</h1>
            <p className="text-2xl text-muted-foreground">{t("learning.subtitle")}</p>
          </div>

          <Card className="mb-10 p-6 border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-indigo-500/5">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-bold">Generate a tutorial with AI</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-4">
              Don't see a topic? Ask the AI tutor to create a step-by-step guide just for you. For example:
              "How to take a screenshot on my phone" or "How to video call my granddaughter".
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGenerate();
                }}
                placeholder="Type any topic you want to learn"
                className="text-lg py-3"
                disabled={generating}
                data-testid="input-ai-topic"
              />
              <Button size="lg" className="text-lg px-6" onClick={handleGenerate} disabled={generating || !topic.trim()}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" /> Generate
                  </>
                )}
              </Button>
            </div>
            {genError && <p className="text-red-600 mt-2">{genError}</p>}
          </Card>

          {isAuthenticated && score && (
            <div className="grid md:grid-cols-4 gap-3 mb-8" data-testid="strip-learning-score">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Today
                </div>
                <p className="text-3xl font-bold mt-1">{score.today}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-secondary" /> This week
                </div>
                <p className="text-3xl font-bold mt-1">{score.daily}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4 text-yellow-600" /> Overall
                </div>
                <p className="text-3xl font-bold mt-1">{score.overall}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="h-4 w-4 text-orange-500" /> Streak
                </div>
                <p className="text-3xl font-bold mt-1">{score.streak}</p>
              </Card>
            </div>
          )}

          {isAuthenticated && saved.length > 0 && (
            <div className="mb-10">
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-primary" /> Your AI tutorials
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {saved.map((s) => (
                  <Card
                    key={s.id}
                    className="p-5 hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/tutorial/ai/${s.id}`)}
                    data-testid={`card-saved-tutorial-${s.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold flex-1">{s.topic}</h3>
                      {s.score != null && s.total != null && s.total > 0 && (
                        <Badge className="ml-2 bg-yellow-500 text-white">
                          <Trophy className="h-3 w-3 mr-1" />
                          {s.score}/{s.total}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{s.intro}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {s.steps.length} steps
                        {Array.isArray(s.quiz) && s.quiz.length > 0 ? ` · ${s.quiz.length} quiz` : ""}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s.id);
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-5 w-5 self-center text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tutorials.map((tutorial, index) => {
              const Icon = tutorial.icon;
              return (
                <Card
                  key={index}
                  className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden flex flex-col"
                  onClick={() => setLocation(`/tutorial/${tutorial.route}`)}
                  data-testid={`card-tutorial-${index}`}
                >
                  <div className="h-48 overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={tutorial.image}
                      alt={tutorial.title}
                      className="w-full h-full object-cover"
                      data-testid={`image-tutorial-${index}`}
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1">
                        <Icon className={`${tutorial.iconColor} h-10 w-10 flex-shrink-0`} />
                        <CardTitle className="text-2xl">{tutorial.title}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-base whitespace-nowrap">
                        {tutorial.lessons} {t("learning.lessons")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 pb-6">
                    <CardDescription className="text-lg mb-4 flex-1">
                      {tutorial.description}
                    </CardDescription>
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-muted-foreground font-medium">{tutorial.duration}</p>
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-12 text-lg"
                      data-testid={`button-start-${index}`}
                    >
                      {t("learning.startCourse")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
