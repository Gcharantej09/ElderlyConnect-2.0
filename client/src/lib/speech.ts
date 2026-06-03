import { useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const LANG_TO_BCP47: Record<string, string> = {
  en: "en-US",
  te: "te-IN",
  hi: "hi-IN",
};

export function useSpeechLanguage() {
  const { language } = useLanguage();
  return LANG_TO_BCP47[language] || "en-US";
}

export function useSpeak() {
  const lang = useSpeechLanguage();
  return useCallback(
    (text: string, opts: { rate?: number; onStart?: () => void; onEnd?: () => void } = {}) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = opts.rate ?? 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = lang;
        if (opts.onStart) utterance.onstart = opts.onStart;
        if (opts.onEnd) utterance.onend = opts.onEnd;
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase()));
        if (match) utterance.voice = match;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("TTS error", err);
      }
    },
    [lang],
  );
}

export function useListenOnce() {
  const lang = useSpeechLanguage();
  return useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("No window"));
        return;
      }
      const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!Ctor) {
        reject(new Error("Speech recognition is not supported in this browser. Try Chrome or Edge."));
        return;
      }
      const recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;
      let settled = false;
      recognition.onresult = (ev: any) => {
        const text = ev.results?.[0]?.[0]?.transcript || "";
        if (!settled) {
          settled = true;
          resolve(text);
        }
      };
      recognition.onerror = (ev: any) => {
        if (!settled) {
          settled = true;
          reject(new Error(ev.error || "speech recognition failed"));
        }
      };
      recognition.onend = () => {
        if (!settled) {
          settled = true;
          resolve("");
        }
      };
      try {
        recognition.start();
      } catch (err) {
        if (!settled) {
          settled = true;
          reject(err instanceof Error ? err : new Error("failed to start recognition"));
        }
      }
    });
  }, [lang]);
}
