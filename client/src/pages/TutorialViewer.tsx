import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TutorialSlides } from "@/components/TutorialSlides";
import { SiWhatsapp, SiYoutube, SiGmail, SiFacebook, SiGooglechrome } from "react-icons/si";
import { translations } from "@/data/translations";

const tutorialMetadata = {
  whatsapp: {
    name: "WhatsApp",
    icon: <SiWhatsapp className="h-16 w-16 text-green-600 dark:text-green-400" />,
    slideKey: "whatsapp" as const,
  },
  youtube: {
    name: "YouTube",
    icon: <SiYoutube className="h-16 w-16 text-red-600 dark:text-red-400" />,
    slideKey: "youtube" as const,
  },
  email: {
    name: "Email",
    icon: <SiGmail className="h-16 w-16 text-blue-600 dark:text-blue-400" />,
    slideKey: "email" as const,
  },
  facebook: {
    name: "Facebook",
    icon: <SiFacebook className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />,
    slideKey: "facebook" as const,
  },
  chrome: {
    name: "Chrome Browser",
    icon: <SiGooglechrome className="h-16 w-16 text-yellow-600 dark:text-yellow-400" />,
    slideKey: "chrome" as const,
  },
};

type AITutorial = {
  intro: string;
  steps: { title: string; description: string; tip?: string }[];
  success: string;
  quiz?: unknown[];
};

export default function TutorialViewer() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/tutorial/:app");
  const { language, t } = useLanguage();

  if (!match || !params?.app) {
    setLocation("/learning");
    return null;
  }

  const key = params.app;

  if (key === "ai" || key === "preview") {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const dataParam = new URLSearchParams(search).get("data");
    let parsed: AITutorial | null = null;
    if (dataParam) {
      try {
        parsed = JSON.parse(decodeURIComponent(dataParam));
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      setLocation("/learning");
      return null;
    }
    const aiSlides: { title: string; description: string; steps: string[] }[] = parsed.steps.map((s) => ({
      title: s.title,
      description: s.description,
      steps: s.description ? [s.description] : [],
    }));
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <Button variant="ghost" size="lg" onClick={() => setLocation("/learning")} data-testid="button-back">
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t("nav.back")}
            </Button>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="container mx-auto px-6 py-8 max-w-3xl">
          <Card className="p-6 mb-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-indigo-500/5">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold">AI Tutorial</h1>
            </div>
            <p className="text-lg text-muted-foreground">{parsed.intro}</p>
            <p className="text-sm text-muted-foreground mt-3">
              Sign in to save this tutorial, track your progress, and take the quiz.
            </p>
          </Card>
          <TutorialSlides
            appName="AI Tutorial"
            appIcon={<Sparkles className="h-16 w-16 text-primary" />}
            slides={aiSlides}
            onComplete={() => {
              alert(parsed.success);
              setLocation("/auth");
            }}
          />
        </div>
      </div>
    );
  }

  const tutorialKey = key as keyof typeof tutorialMetadata;
  const tutorial = tutorialMetadata[tutorialKey];

  if (!tutorial) {
    setLocation("/learning");
    return null;
  }

  const langKey = language as keyof typeof translations;
  const slides = translations[langKey]?.slides?.[tutorial.slideKey] || [];

  const handleComplete = () => {
    alert(`${t("tutorial.congratulations")} ${tutorial.name} ${t("tutorial.tutorialCompleted")}`);
    setLocation("/learning");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="lg" onClick={() => setLocation("/learning")} data-testid="button-back">
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
        <TutorialSlides
          appName={tutorial.name}
          appIcon={tutorial.icon}
          slides={slides}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
