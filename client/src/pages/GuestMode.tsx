import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MessageCircle, Shield, ArrowLeft, Lock, Watch } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import aiAssistantIcon from "@assets/generated_images/friendly_ai_assistant_icon.png";

export default function GuestMode() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const guestFeatures = [
    {
      id: "tutorials",
      icon: BookOpen,
      title: t("guest.basicTutorials"),
      description: t("guest.basicTutorialsDesc"),
      available: true,
    },
    {
      id: "ai",
      icon: MessageCircle,
      title: t("guest.chatAssistant"),
      description: t("guest.chatAssistantDesc"),
      available: true,
    },
    {
      id: "privacy",
      icon: Shield,
      title: t("guest.privacyBasics"),
      description: t("guest.privacyBasicsDesc"),
      available: true,
    },
    {
      id: "smartwatch",
      icon: Watch,
      title: "Smartwatch & Health",
      description: "Track health data, manage reminders",
      available: true,
    },
  ];

  const premiumFeatures = [
    t("guest.premiumReminders"),
    t("guest.premiumHealth"),
    t("guest.premiumProgress"),
    t("guest.premiumSmartwatch"),
    t("guest.premiumAdvanced"),
    t("guest.premiumFamily"),
  ];

  const handleFeatureClick = (id: string) => {
    if (id === "ai") {
      setLocation("/ai-tutor");
    } else if (id === "tutorials") {
      setLocation("/learning");
    } else if (id === "privacy") {
      setLocation("/privacy");
    } else if (id === "smartwatch") {
      setLocation("/smartwatch");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="lg"
            className="text-lg"
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            {t("nav.back")}
          </Button>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <Button
            size="lg"
            className="h-14 px-8 text-lg"
            onClick={() => setLocation("/auth")}
            data-testid="button-upgrade"
          >
            {t("guest.signInUnlock")}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6">{t("guest.welcome")}</h1>
            <p className="text-2xl text-muted-foreground leading-relaxed">
              {t("guest.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {guestFeatures.map((feature, index) => (
              <Card
                key={feature.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => handleFeatureClick(feature.id)}
                data-testid={`card-guest-feature-${index}`}
              >
                <CardHeader>
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-lg leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  <Button
                    size="lg"
                    className="w-full mt-6 h-14 text-lg"
                    data-testid={`button-try-${index}`}
                  >
                    {t("guest.tryNow")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-accent/50 bg-accent/5">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-8 w-8 text-accent" />
                <CardTitle className="text-3xl">{t("guest.unlockMore")}</CardTitle>
              </div>
              <CardDescription className="text-lg">
                {t("guest.unlockMoreDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {premiumFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3" data-testid={`premium-feature-${index}`}>
                    <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-foreground text-sm">✓</span>
                    </div>
                    <span className="text-lg">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                className="w-full h-14 text-lg"
                onClick={() => setLocation("/auth")}
                data-testid="button-sign-in-unlock"
              >
                {t("guest.signInUnlock")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
