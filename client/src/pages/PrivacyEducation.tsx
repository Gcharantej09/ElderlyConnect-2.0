import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Unlock, ShieldCheck, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PrivacyEducation() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const safetyTopics = useMemo(() => [
    {
      icon: Lock,
      title: t("privacy.whatToKeepPrivate"),
      description: t("privacy.bankDetails"),
      type: "protect",
      examples: [t("privacy.creditCard"), t("privacy.socialSecurity"), t("privacy.passwords")],
    },
    {
      icon: ShieldCheck,
      title: t("privacy.whatsSafeToShare"),
      description: t("privacy.publicPosts"),
      type: "safe",
      examples: [t("privacy.yourHobbies"), t("privacy.generalLocation"), t("privacy.publicPhotos")],
    },
    {
      icon: AlertTriangle,
      title: t("privacy.spotScams"),
      description: t("privacy.recognizeFake"),
      type: "warning",
      examples: [t("privacy.tooGoodOffers"), t("privacy.urgentPayment"), t("privacy.unknownLinks")],
    },
  ], [t]);

  const encryptionComparison = useMemo(() => [
    {
      type: t("privacy.encrypted"),
      icon: Lock,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      description: t("privacy.dataScrambled"),
      examples: [t("privacy.httpsWebsites"), t("privacy.encryptedMessaging"), t("privacy.passwordProtected")],
    },
    {
      type: t("privacy.notEncrypted"),
      icon: Unlock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      description: t("privacy.dataCanRead"),
      examples: [t("privacy.httpWebsites"), t("privacy.textMessages"), t("privacy.unprotectedWifi")],
    },
  ], [t]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
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
          <h1 className="text-2xl font-semibold">{t("guest.privacyBasics")}</h1>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">{t("privacy.stayingSafe")}</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {t("privacy.learnRules")}
            </p>
          </div>

          <section>
            <h3 className="text-3xl font-bold mb-8 text-center">{t("privacy.understandingData")}</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {safetyTopics.map((topic, index) => (
                <Card
                  key={index}
                  className="hover-elevate"
                  data-testid={`card-safety-${index}`}
                >
                  <CardHeader>
                    <div
                      className={`h-16 w-16 rounded-lg ${
                        topic.type === "protect"
                          ? "bg-red-100 dark:bg-red-900/20"
                          : topic.type === "safe"
                            ? "bg-green-100 dark:bg-green-900/20"
                            : "bg-orange-100 dark:bg-orange-900/20"
                      } flex items-center justify-center mb-4`}
                    >
                      <topic.icon
                        className={`h-8 w-8 ${
                          topic.type === "protect"
                            ? "text-red-600 dark:text-red-400"
                            : topic.type === "safe"
                              ? "text-green-600 dark:text-green-400"
                              : "text-orange-600 dark:text-orange-400"
                        }`}
                      />
                    </div>
                    <CardTitle className="text-2xl">{topic.title}</CardTitle>
                    <CardDescription className="text-lg leading-relaxed">
                      {topic.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topic.examples.map((example, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="h-2 w-2 rounded-full bg-current mt-2 flex-shrink-0" />
                          <span className="text-base">{example}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-3xl font-bold mb-8 text-center">
              {t("privacy.encryption")}
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              {encryptionComparison.map((item, index) => (
                <Card
                  key={index}
                  className={`border-2 ${item.bgColor}`}
                  data-testid={`card-encryption-${index}`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`h-16 w-16 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                        <item.icon className={`h-8 w-8 ${item.color}`} />
                      </div>
                      <CardTitle className="text-3xl">{item.type}</CardTitle>
                    </div>
                    <CardDescription className="text-xl leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="font-semibold text-lg mb-3">{t("dashboard.tutorialsDesc").split(" ")[0] || "Examples"}:</p>
                      {item.examples.map((example, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Badge variant="secondary" className="mt-1">
                            {i + 1}
                          </Badge>
                          <span className="text-lg">{example}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <Card className="border-2 border-primary">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">{t("privacy.quickSafetyTips")}</CardTitle>
                    <CardDescription className="text-lg">
                      {t("privacy.rememberRules")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {useMemo(() => [
                    t("privacy.lookForLock"),
                    t("privacy.neverSharePasswords"),
                    t("privacy.tooGood"),
                    t("privacy.dontClickLinks"),
                    t("privacy.differentPasswords"),
                    t("privacy.askHelp"),
                  ], [t]).map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-lg font-bold">
                        {index + 1}
                      </div>
                      <span className="text-lg leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="text-center">
            <Button
              size="lg"
              className="h-16 px-10 text-xl"
              onClick={() => setLocation("/ai-tutor")}
              data-testid="button-ask-ai"
            >
              {t("guest.chatAssistant")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
