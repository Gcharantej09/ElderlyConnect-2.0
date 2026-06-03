import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListenOnce, useSpeak } from "@/lib/speech";
import { cn } from "@/lib/utils";

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type AITutorial = {
  id: string;
  userId?: string;
  topic: string;
  app?: string | null;
  category?: string | null;
  tags?: string[];
  intro: string;
  steps: { title: string; description: string; tip?: string }[];
  success: string;
  quiz: QuizQuestion[];
  score: number | null;
  total: number | null;
  source?: string;
  createdAt?: string;
  completedAt?: string | null;
};

type Phase = "loading" | "intro" | "steps" | "quiz" | "result" | "error";

export default function AITutorialSession() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/tutorial/ai/:id");
  const { t } = useLanguage();
  const speak = useSpeak();
  const listen = useListenOnce();

  const [tutorial, setTutorial] = useState<AITutorial | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);
  const [readAloud, setReadAloud] = useState(true);
  const [voiceNav, setVoiceNav] = useState(true);
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!match || !params?.id) return;
    void load(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, params?.id]);

  useEffect(() => {
    if (!tutorial) return;
    if (phase === "steps" && readAloud) {
      const current = tutorial.steps[stepIndex];
      if (current) speak(`${current.title}. ${current.description}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex, tutorial]);

  async function load(id: string) {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/tutorials/ai/${id}`, { credentials: "include" });
      if (!res.ok) {
        setError("Could not load this tutorial.");
        setPhase("error");
        return;
      }
      const data = await res.json();
      setTutorial(data.tutorial);
      setCompletedSteps(data.completedSteps || []);
      setPhase("intro");
    } catch (err) {
      setError("Network error.");
      setPhase("error");
    }
  }

  async function advanceFromStep() {
    if (!tutorial) return;
    if (stepIndex >= tutorial.steps.length) {
      if (tutorial.quiz.length > 0) {
        setPhase("quiz");
        speak("Great work! Now let's do a short quiz to test what you learned.");
      } else {
        await submitEmptyScore();
      }
      return;
    }
    try {
      await fetch(`/api/tutorials/ai/${tutorial.id}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stepIndex }),
      });
    } catch (err) {
      console.error(err);
    }
    setCompletedSteps((prev) => (prev.includes(stepIndex) ? prev : [...prev, stepIndex]));
    if (stepIndex + 1 < tutorial.steps.length) {
      setStepIndex(stepIndex + 1);
    } else {
      if (tutorial.quiz.length > 0) {
        setPhase("quiz");
        speak("Great work! Now let's do a short quiz to test what you learned.");
      } else {
        await submitEmptyScore();
      }
    }
  }

  function previousStep() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  async function submitQuiz() {
    if (!tutorial) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tutorials/ai/${tutorial.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore({ score: data.score, total: data.total });
        setPhase("result");
        speak(
          `You scored ${data.score} out of ${data.total}. ${data.score === data.total ? "Perfect score!" : "Great effort."}`,
        );
      } else {
        setError("Could not submit your score.");
      }
    } catch (err) {
      setError("Network error submitting score.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEmptyScore() {
    if (!tutorial) return;
    setSubmitting(true);
    try {
      await fetch(`/api/tutorials/ai/${tutorial.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers: [] }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
      setScore({ score: 0, total: 0 });
      setPhase("result");
    }
  }

  async function handleVoiceCommand() {
    if (!voiceNav) return;
    if (listening) {
      setListening(false);
      return;
    }
    setListening(true);
    try {
      const text = await listen();
      setListening(false);
      const t = text.toLowerCase();
      if (!t) return;
      if (/(next|forward|continue|go on|mark done|i did it|finished)/.test(t)) {
        advanceFromStep();
      } else if (/(back|previous|go back)/.test(t)) {
        previousStep();
      } else if (/(repeat|read again|again)/.test(t) && tutorial) {
        const current = tutorial.steps[stepIndex];
        if (current) speak(`${current.title}. ${current.description}`);
      }
    } catch (err) {
      setListening(false);
    }
  }

  if (phase === "loading") {
    return (
      <Center>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading your tutorial...</p>
      </Center>
    );
  }
  if (phase === "error" || !tutorial) {
    return (
      <Center>
        <p className="text-2xl text-red-600 mb-4">{error || "Tutorial not found"}</p>
        <Button onClick={() => setLocation("/learning")}>Back to Learning</Button>
      </Center>
    );
  }

  const totalSteps = tutorial.steps.length;
  const totalQuiz = tutorial.quiz.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" size="lg" onClick={() => setLocation("/learning")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{tutorial.topic}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setReadAloud((v) => !v)}
              aria-label="Toggle read aloud"
            >
              {readAloud ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant={voiceNav ? "default" : "outline"}
              size="icon"
              onClick={() => setVoiceNav((v) => !v)}
              aria-label="Toggle voice navigation"
            >
              {voiceNav ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-3xl">
        {phase === "intro" && (
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Sparkles className="h-8 w-8 text-primary" />
              <Badge className="text-base">{tutorial.steps.length} slides</Badge>
              {tutorial.quiz.length > 0 && (
                <Badge variant="secondary" className="text-base">
                  {tutorial.quiz.length} quiz questions
                </Badge>
              )}
              {tutorial.app && tutorial.app !== "general" && (
                <Badge variant="outline" className="text-base capitalize" data-testid="badge-app">
                  {tutorial.app}
                </Badge>
              )}
              {tutorial.category && (
                <Badge variant="outline" className="text-base capitalize">
                  {tutorial.category}
                </Badge>
              )}
            </div>
            {tutorial.tags && tutorial.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tutorial.tags.slice(0, 6).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <h2 className="text-4xl font-bold mb-4">Welcome!</h2>
            <p className="text-xl text-muted-foreground mb-6 leading-relaxed">{tutorial.intro}</p>
            <div className="flex gap-3 flex-wrap">
              <Button size="lg" onClick={() => setPhase("steps")} data-testid="button-start-tutorial">
                Start Tutorial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/learning")}>
                Save for later
              </Button>
              {tutorial.steps.length >= 10 && (
                <Badge variant="default" className="text-base self-center">
                  {tutorial.steps.length} comprehensive slides ready
                </Badge>
              )}
            </div>
          </Card>
        )}

        {phase === "steps" && (
          <div>
            <Progress
              value={((stepIndex + 1) / totalSteps) * 100}
              className="mb-6 h-3"
            />
            <Card className="p-8">
              <p className="text-sm text-muted-foreground mb-2">
                Step {stepIndex + 1} of {totalSteps}
              </p>
              <h2 className="text-4xl font-bold mb-4">{tutorial.steps[stepIndex].title}</h2>
              <p className="text-2xl leading-relaxed mb-6">{tutorial.steps[stepIndex].description}</p>
              {tutorial.steps[stepIndex].tip && (
                <div className="rounded-lg border bg-muted/40 p-4 mb-6">
                  <p className="text-sm font-semibold mb-1 text-muted-foreground">Tip</p>
                  <p className="text-lg">{tutorial.steps[stepIndex].tip}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={previousStep}
                  disabled={stepIndex === 0}
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="mr-2 h-5 w-5" /> Previous
                </Button>
                <Button size="lg" onClick={advanceFromStep} data-testid="button-next-step">
                  {stepIndex + 1 === totalSteps
                    ? totalQuiz > 0
                      ? "Take the Quiz"
                      : "Finish"
                    : "I did this, next"}{" "}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                {voiceNav && (
                  <Button
                    size="lg"
                    variant={listening ? "destructive" : "secondary"}
                    onClick={handleVoiceCommand}
                    data-testid="button-voice-nav"
                  >
                    {listening ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
                    {listening ? "Listening..." : "Voice command"}
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  Say: "next", "back", "repeat", or "I did it"
                </span>
              </div>
            </Card>
            <div className="mt-6 flex flex-wrap gap-2">
              {tutorial.steps.map((_s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={cn(
                    "h-3 w-8 rounded-full transition-all",
                    i === stepIndex
                      ? "bg-primary w-12"
                      : completedSteps.includes(i)
                        ? "bg-green-500"
                        : "bg-muted",
                  )}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {phase === "quiz" && totalQuiz > 0 && (
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-7 w-7 text-yellow-500" />
              <h2 className="text-3xl font-bold">Quick Quiz</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-6">
              Answer these questions to test what you learned.
            </p>
            <div className="space-y-6">
              {tutorial.quiz.map((q, qi) => (
                <div key={qi} className="rounded-lg border p-4">
                  <p className="text-lg font-semibold mb-3">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={cn(
                          "flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40",
                          answers[qi] === oi && "border-primary bg-primary/5",
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          checked={answers[qi] === oi}
                          onChange={() => {
                            const next = [...answers];
                            next[qi] = oi;
                            setAnswers(next);
                          }}
                          className="h-5 w-5"
                        />
                        <span className="text-lg">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                size="lg"
                onClick={submitQuiz}
                disabled={submitting || answers.length < totalQuiz}
                data-testid="button-submit-quiz"
              >
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Trophy className="mr-2 h-5 w-5" />}
                Submit answers
              </Button>
              <Button size="lg" variant="outline" onClick={() => setPhase("steps")}>
                Back to steps
              </Button>
            </div>
            {answers.length < totalQuiz && (
              <p className="text-sm text-muted-foreground mt-3">
                Answer all questions to submit. ({answers.length}/{totalQuiz} answered)
              </p>
            )}
          </Card>
        )}

        {phase === "result" && score && (
          <Card className="p-10 text-center">
            <Trophy
              className={cn(
                "h-20 w-20 mx-auto mb-4",
                score.total > 0 && score.score === score.total
                  ? "text-yellow-500"
                  : "text-primary",
              )}
            />
            <h2 className="text-4xl font-bold mb-2">Your Score</h2>
            <p className="text-6xl font-bold mb-2 text-primary">
              {score.score} / {score.total || totalQuiz}
            </p>
            {score.total > 0 && (
              <p className="text-2xl text-muted-foreground mb-6">
                {Math.round((score.score / score.total) * 100)}% correct
              </p>
            )}
            {score.total > 0 && score.score === score.total && (
              <p className="text-xl text-green-600 mb-6">Perfect score! Excellent work.</p>
            )}
            {score.total > 0 && score.score > 0 && score.score < score.total && (
              <p className="text-xl text-blue-600 mb-6">Good effort. Practice makes perfect.</p>
            )}
            {score.total === 0 && (
              <p className="text-xl text-muted-foreground mb-6">Tutorial complete.</p>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" onClick={() => setLocation("/learning")} data-testid="button-back-to-learning">
                Back to Learning
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setStepIndex(0);
                  setCompletedSteps([]);
                  setAnswers([]);
                  setScore(null);
                  setPhase("intro");
                }}
              >
                Review tutorial
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col p-6 text-center">
      {children}
    </div>
  );
}
