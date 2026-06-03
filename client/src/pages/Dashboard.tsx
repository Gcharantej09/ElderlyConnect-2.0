import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Activity,
  TrendingUp,
  Clock,
  Pill,
  Dumbbell,
  Award,
  BookOpen,
  Bluetooth,
  LogOut,
  MessageCircle,
  Shield,
  Check,
  Sparkles,
  Trophy,
  Flame,
  Calendar,
  ArrowRight,
  Bell,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import smartwatchImage from "@assets/generated_images/smartwatch_health_display.png";

interface HealthMetrics {
  id: string;
  heartRate: number | null;
  steps: number | null;
  bloodOxygen: number | null;
  sleepQuality: string | null;
  recordedAt: string;
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  type: string;
  completed: boolean;
  completedAt: string | null;
}

interface Achievement {
  id: string;
  title: string;
  description: string | null;
  earnedAt: string;
}

interface ProgressItem {
  id: string;
  appName: string;
  completed: boolean;
  completedAt: string | null;
}

interface AiTutorialSummary {
  id: string;
  topic: string;
  app?: string | null;
  category?: string | null;
  score?: number | null;
  total?: number | null;
  createdAt: string;
  completedAt?: string | null;
  steps?: { title: string; description: string }[];
}

interface LearningScore {
  today: number;
  daily: number;
  overall: number;
  streak: number;
  completedToday: number;
}

const REMINDER_ICONS: Record<string, typeof Pill> = {
  medication: Pill,
  exercise: Dumbbell,
  break: Clock,
  walk: Dumbbell,
  default: Clock,
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [recentTutorials, setRecentTutorials] = useState<AiTutorialSummary[]>([]);
  const [learningScore, setLearningScore] = useState<LearningScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/health", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/reminders", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/achievements", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/progress", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/tutorials/ai", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/learning/score", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([h, r, a, p, t, s]) => {
        if (!mounted) return;
        setHealth(h);
        setReminders(Array.isArray(r) ? r : []);
        setAchievements(Array.isArray(a) ? a : []);
        setProgress(Array.isArray(p) ? p : []);
        setRecentTutorials(Array.isArray(t) ? t.slice(0, 5) : []);
        setLearningScore(s && typeof s === "object" ? s : null);
      })
      .catch((err) => console.error("Dashboard load error:", err))
      .finally(() => mounted && setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const toggleReminder = async (id: string, completed: boolean) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, completed } : r)));
    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });
    } catch (err) {
      console.error("Failed to update reminder:", err);
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, completed: !completed } : r)));
    }
  };

  const healthMetrics = [
    {
      icon: Heart,
      label: "Heart Rate",
      value: health?.heartRate ? String(health.heartRate) : "—",
      unit: "bpm",
      status: health?.heartRate && health.heartRate < 100 ? "good" : "monitor",
    },
    {
      icon: Activity,
      label: "Steps Today",
      value: health?.steps ? health.steps.toLocaleString() : "—",
      unit: "steps",
      status: health?.steps && health.steps > 1000 ? "good" : "monitor",
    },
    {
      icon: TrendingUp,
      label: "Blood Oxygen",
      value: health?.bloodOxygen ? String(health.bloodOxygen) : "—",
      unit: "%",
      status: health?.bloodOxygen && health.bloodOxygen >= 95 ? "good" : "monitor",
    },
    {
      icon: Clock,
      label: "Sleep Quality",
      value: health?.sleepQuality ?? "—",
      unit: "",
      status: "good",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <span className="text-2xl font-semibold block leading-none">
                {t("app.name")}
              </span>
              {user && (
                <span className="text-sm text-muted-foreground" data-testid="text-username">
                  {user.username}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="lg"
              className="text-lg"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-5 w-5" />
              {t("nav.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("dashboard.welcomeBack")}</h1>
            <p className="text-xl text-muted-foreground">{t("dashboard.overview")}</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 h-14">
              <TabsTrigger value="overview" className="text-lg" data-testid="tab-overview">
                {t("dashboard.tabs.overview")}
              </TabsTrigger>
              <TabsTrigger value="health" className="text-lg" data-testid="tab-health">
                {t("dashboard.tabs.health")}
              </TabsTrigger>
              <TabsTrigger value="learning" className="text-lg" data-testid="tab-learning">
                {t("dashboard.tabs.learning")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <Card className="border-2 border-secondary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bluetooth className="h-8 w-8 text-secondary" />
                      <div>
                        <CardTitle className="text-2xl">
                          {t("dashboard.smartwatchConnected")}
                        </CardTitle>
                        <CardDescription className="text-lg">
                          {t("dashboard.healthDataSyncing")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      className="text-base px-4 py-2 bg-secondary text-secondary-foreground"
                      data-testid="badge-watch-status"
                    >
                      {health ? t("dashboard.active") : "No data yet"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              <div>
                <h2 className="text-3xl font-bold mb-6">{t("dashboard.todayHealth")}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {healthMetrics.map((metric, index) => (
                    <Card key={index} data-testid={`card-health-${index}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <metric.icon className="h-8 w-8 text-primary" />
                          <Badge
                            variant={metric.status === "good" ? "default" : "secondary"}
                            className="text-sm"
                          >
                            {metric.status === "good"
                              ? t("dashboard.good")
                              : t("dashboard.monitor")}
                          </Badge>
                        </div>
                        <CardDescription className="text-base">{metric.label}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold">{metric.value}</span>
                          {metric.unit && (
                            <span className="text-xl text-muted-foreground">{metric.unit}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-6">Learning Score</h2>
                <p className="text-base text-muted-foreground mb-4">
                  Track what you learned today, this week, and overall — just like a coding streak.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <Card className="border-2" data-testid="card-score-today">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <CardDescription className="text-base">Today</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{learningScore?.today ?? 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">tutorials finished today</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2" data-testid="card-score-daily">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-secondary" />
                        <CardDescription className="text-base">This week (7 days)</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{learningScore?.daily ?? 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">tutorials in the last 7 days</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2" data-testid="card-score-overall">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-yellow-600" />
                        <CardDescription className="text-base">Overall</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{learningScore?.overall ?? 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">tutorials finished in total</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2" data-testid="card-score-streak">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Flame className="h-6 w-6 text-orange-500" />
                        <CardDescription className="text-base">Streak</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{learningScore?.streak ?? 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        consecutive day{(learningScore?.streak ?? 0) === 1 ? "" : "s"} of learning
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-6">Recent AI Tutorials</h2>
                <p className="text-base text-muted-foreground mb-4">
                  Everything you have asked the AI tutor to teach you. Open any tutorial to keep going.
                </p>
                {recentTutorials.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="py-10 text-center">
                      <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">No AI tutorials yet.</p>
                      <p className="text-base text-muted-foreground mb-4">
                        Ask the AI tutor about any app — Instagram, Snapchat, WhatsApp, Excel, anything.
                      </p>
                      <Button
                        size="lg"
                        onClick={() => setLocation("/ai-tutor")}
                        data-testid="button-open-ai-tutor"
                      >
                        Open AI Tutor
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {recentTutorials.map((t) => (
                      <Card
                        key={t.id}
                        className="hover-elevate cursor-pointer"
                        onClick={() => setLocation(`/tutorial/ai/${t.id}`)}
                        data-testid={`card-recent-tutorial-${t.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <CardTitle className="text-2xl">{t.topic}</CardTitle>
                            {t.app && t.app !== "general" && (
                              <Badge variant="outline" className="text-sm capitalize">
                                {t.app}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {t.steps ? (
                              <Badge variant="secondary">{t.steps.length} slides</Badge>
                            ) : null}
                            {t.score != null && t.total != null ? (
                              <Badge variant={t.score === t.total ? "default" : "secondary"}>
                                Score {t.score}/{t.total}
                              </Badge>
                            ) : (
                              <Badge variant="outline">In progress</Badge>
                            )}
                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Button
                            variant="secondary"
                            size="sm"
                            data-testid={`button-open-tutorial-${t.id}`}
                          >
                            Open tutorial <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-6">Custom Reminders</h2>
                <Card className="border-2">
                  <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bell className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="text-xl font-semibold">Keep your own tasks</p>
                        <p className="text-base text-muted-foreground">
                          Add reminders for any task — call family, water plants, doctor visit, anything.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setLocation("/reminders")}
                        data-testid="button-open-reminders"
                      >
                        Open Reminders
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => setLocation("/health")}
                        data-testid="button-open-health"
                      >
                        Open Health
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-6">{t("dashboard.todayReminders")}</h2>
                <Card>
                  <CardContent className="pt-6">
                    {isLoading ? (
                      <p className="text-lg text-muted-foreground text-center py-6">
                        Loading reminders...
                      </p>
                    ) : reminders.length === 0 ? (
                      <p
                        className="text-lg text-muted-foreground text-center py-6"
                        data-testid="text-no-reminders"
                      >
                        No reminders yet. Add some from the Smartwatch page!
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {reminders.map((reminder) => {
                          const Icon = REMINDER_ICONS[reminder.type] ?? REMINDER_ICONS.default;
                          return (
                            <div
                              key={reminder.id}
                              className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                                reminder.completed
                                  ? "bg-muted/50 opacity-60"
                                  : "bg-background hover-elevate"
                              }`}
                              data-testid={`reminder-${reminder.id}`}
                            >
                              <div
                                className={`h-12 w-12 rounded-lg ${
                                  reminder.completed ? "bg-secondary" : "bg-primary"
                                } flex items-center justify-center flex-shrink-0`}
                              >
                                <Icon
                                  className={`h-6 w-6 ${
                                    reminder.completed
                                      ? "text-secondary-foreground"
                                      : "text-primary-foreground"
                                  }`}
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-xl font-semibold">{reminder.title}</p>
                                {reminder.description && (
                                  <p className="text-lg text-muted-foreground">
                                    {reminder.description}
                                  </p>
                                )}
                              </div>
                              {!reminder.completed ? (
                                <Button
                                  size="lg"
                                  className="h-12 px-6 text-lg"
                                  onClick={() => toggleReminder(reminder.id, true)}
                                  data-testid={`button-complete-${reminder.id}`}
                                >
                                  <Check className="mr-2 h-5 w-5" />
                                  {t("dashboard.markDone")}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="h-12 px-6 text-lg"
                                  onClick={() => toggleReminder(reminder.id, false)}
                                >
                                  Undo
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl">{t("dashboard.aiHealthInsights")}</CardTitle>
                  <CardDescription className="text-lg">
                    {t("dashboard.insights")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-secondary/20 rounded-lg border-2 border-secondary">
                    <div className="flex items-start gap-4">
                      <Activity className="h-8 w-8 text-secondary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{t("dashboard.greatJob")}</h3>
                        <p className="text-lg leading-relaxed text-muted-foreground">
                          {t("dashboard.greatJobDesc")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-accent/20 rounded-lg border-2 border-accent">
                    <div className="flex items-start gap-4">
                      <Heart className="h-8 w-8 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          {t("dashboard.sleepReminder")}
                        </h3>
                        <p className="text-lg leading-relaxed text-muted-foreground">
                          You've been sitting for 2 hours. Consider some gentle stretches or a
                          short walk around your home.
                        </p>
                      </div>
                    </div>
                  </div>

                  <img
                    src={smartwatchImage}
                    alt="Smartwatch displaying health metrics"
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="learning" className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-6">{t("dashboard.learningResources")}</h2>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <Card
                    className="hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setLocation("/learning")}
                    data-testid="card-learning-modules"
                  >
                    <CardHeader>
                      <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <BookOpen className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{t("dashboard.appTutorials")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-lg leading-relaxed mb-6">
                        {t("dashboard.tutorialsDesc")}
                      </CardDescription>
                      <Button size="lg" className="w-full h-12 text-lg" data-testid="button-tutorials">
                        {t("dashboard.exploreTutorials")}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card
                    className="hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setLocation("/ai-tutor")}
                    data-testid="card-ai-tutor"
                  >
                    <CardHeader>
                      <div className="h-16 w-16 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                        <MessageCircle className="h-8 w-8 text-secondary" />
                      </div>
                      <CardTitle className="text-2xl">{t("dashboard.aiTutorCard")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-lg leading-relaxed mb-6">
                        {t("dashboard.aiTutorDesc")}
                      </CardDescription>
                      <Button size="lg" className="w-full h-12 text-lg" data-testid="button-ai-tutor">
                        {t("dashboard.chatAI")}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card
                    className="hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setLocation("/privacy")}
                    data-testid="card-privacy"
                  >
                    <CardHeader>
                      <div className="h-16 w-16 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                        <Shield className="h-8 w-8 text-accent" />
                      </div>
                      <CardTitle className="text-2xl">{t("dashboard.privacySafety")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-lg leading-relaxed mb-6">
                        {t("dashboard.privacyDesc")}
                      </CardDescription>
                      <Button size="lg" className="w-full h-12 text-lg" data-testid="button-privacy">
                        {t("dashboard.learnSafety")}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {progress.length > 0 && (
                <div>
                  <h2 className="text-3xl font-bold mb-6">{t("dashboard.learningProgress")}</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {progress.map((p) => (
                      <Card key={p.id} data-testid={`card-progress-${p.id}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <CardTitle className="text-2xl">{p.appName}</CardTitle>
                            <Badge variant="outline" className="text-base">
                              {p.completed ? "100%" : "0%"}
                            </Badge>
                          </div>
                          <Progress value={p.completed ? 100 : 0} className="h-3" />
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {achievements.length > 0 && (
                <div>
                  <h2 className="text-3xl font-bold mb-6">{t("dashboard.achievements")}</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {achievements.map((achievement) => (
                      <Card key={achievement.id} className="border-2 border-accent" data-testid={`card-achievement-${achievement.id}`}>
                        <CardHeader>
                          <div className="h-16 w-16 rounded-lg bg-accent flex items-center justify-center mb-4">
                            <Award className="h-8 w-8 text-accent-foreground" />
                          </div>
                          <CardTitle className="text-xl">{achievement.title}</CardTitle>
                          {achievement.description && (
                            <CardDescription className="text-base">
                              {achievement.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
