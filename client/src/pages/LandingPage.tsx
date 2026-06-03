import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-semibold">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {t("landing.title")}
          </h1>
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
            {t("landing.subtitle")}
          </p>

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={() => setLocation("/auth")}
              data-testid="button-signin"
            >
              {t("nav.signin")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-lg"
              onClick={() => setLocation("/guest")}
              data-testid="button-explore-guest"
            >
              {t("landing.exploreGuest")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
