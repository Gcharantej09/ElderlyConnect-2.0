import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations } from "@/data/translations";

type Language = "en" | "te" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage && ["en", "te", "hi"].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    if (["en", "te", "hi"].includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem("language", lang);

      // Update voice recognition language
      const langMap: Record<Language, string> = {
        en: "en-US",
        te: "te-IN",
        hi: "hi-IN",
      };
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        sessionStorage.setItem("voiceLanguage", langMap[lang]);
      }

      // Force re-render of all components using this context
      window.dispatchEvent(new Event("languageChange"));
    }
  };

  const t = (key: string): string => {
    try {
      const keys = key.split(".");
      let value: any = translations[language];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return key; // Return key if translation not found
        }
      }

      return value && typeof value === "string" ? value : key;
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return key;
    }
  };

  if (!mounted) {
    return null; // Don't render until client-side
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
