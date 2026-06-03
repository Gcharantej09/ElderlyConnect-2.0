import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, User, ArrowLeft, LogIn, UserPlus, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            {t("nav.back")}
          </Button>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-4">{t("app.name")}</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {t("auth.title")}
            </p>
          </div>

          <Card className="border-2">
            <CardHeader>
              <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null); }}>
                <TabsList className="grid w-full grid-cols-2 h-14">
                  <TabsTrigger value="signin" className="text-lg" data-testid="tab-signin">
                    <LogIn className="mr-2 h-5 w-5" />
                    {t("auth.signIn")}
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-lg" data-testid="tab-signup">
                    <UserPlus className="mr-2 h-5 w-5" />
                    {t("auth.signUp")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-auth">
                <div className="space-y-3">
                  <Label htmlFor="username" className="text-lg">
                    {t("auth.username")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-12 h-12 text-lg"
                      autoComplete="username"
                      required
                      data-testid="input-username"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-lg">
                    {t("auth.password")}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-lg"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    data-testid="input-password"
                  />
                </div>

                {mode === "signup" && (
                  <div className="space-y-3">
                    <Label htmlFor="confirmPassword" className="text-lg">
                      {t("auth.confirmPassword")}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 text-lg"
                      autoComplete="new-password"
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                )}

                {error && (
                  <div
                    className="p-4 bg-destructive/10 border-2 border-destructive rounded-lg text-destructive text-base"
                    data-testid="text-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-lg"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("auth.pleaseWait")}
                    </>
                  ) : mode === "signin" ? (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      {t("auth.signIn")}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      {t("auth.createAccount")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-10 text-center">
            <p className="text-muted-foreground text-lg mb-4">
              {t("auth.dontHaveAccount")}
            </p>
            <Button
              size="lg"
              variant="outline"
              className="h-12 text-lg"
              onClick={() => setLocation("/guest")}
              data-testid="button-explore-guest"
            >
              {t("auth.tryGuest")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
