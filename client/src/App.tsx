import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SOSButton } from "@/components/SOSButton";
import VoiceAssistant from "@/components/VoiceAssistant";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import GuestMode from "@/pages/GuestMode";
import AITutorBot from "@/pages/AITutorBot";
import ConversationHistory from "@/pages/ConversationHistory";
import SmartWatchHealth from "@/pages/SmartWatchHealth";
import LearningModules from "@/pages/LearningModules";
import PrivacyEducation from "@/pages/PrivacyEducation";
import Dashboard from "@/pages/Dashboard";
import TutorialViewer from "@/pages/TutorialViewer";
import AITutorialSession from "@/pages/AITutorialSession";
import CustomReminders from "@/pages/CustomReminders";
import HealthPage from "@/pages/HealthPage";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/auth" />;
  return <Component />;
}

function PublicOnlyRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (isAuthenticated) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth">{() => <PublicOnlyRoute component={AuthPage} />}</Route>
      <Route path="/guest" component={GuestMode} />
      <Route path="/ai-tutor" component={AITutorBot} />
      <Route path="/conversation-history" component={ConversationHistory} />
      <Route path="/smartwatch" component={SmartWatchHealth} />
      <Route path="/learning" component={LearningModules} />
      <Route path="/tutorial/:app" component={TutorialViewer} />
      <Route path="/tutorial/ai/:id">{() => <ProtectedRoute component={AITutorialSession} />}</Route>
      <Route path="/privacy" component={PrivacyEducation} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/reminders">{() => <ProtectedRoute component={CustomReminders} />}</Route>
      <Route path="/health">{() => <ProtectedRoute component={HealthPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
              <SOSButton />
              <VoiceAssistant />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
