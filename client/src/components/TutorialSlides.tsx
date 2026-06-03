import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  MessageCircle,
  Check,
} from "lucide-react";
import { useLocation } from "wouter";

export type TutorialSlide = {
  title: string;
  description: string;
  steps: string[];
  image?: string;
  voiceCommands?: string[];
};

type TutorialSlidesProps = {
  appName: string;
  appIcon: React.ReactNode;
  slides: TutorialSlide[];
  onComplete?: () => void;
};

export function TutorialSlides({ appName, appIcon, slides, onComplete }: TutorialSlidesProps) {
  const [, setLocation] = useLocation();
  const { language, t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [isReadAloudEnabled, setIsReadAloudEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const currentSlideRef = useRef(0);
  const shouldListenRef = useRef(false);
  const lastProcessedIndexRef = useRef(-1);

  const handleNext = () => {
    if (currentSlideRef.current < slides.length - 1) {
      const nextSlide = currentSlideRef.current + 1;
      currentSlideRef.current = nextSlide;
      setCurrentSlide(nextSlide);
      if (isReadAloudEnabled) {
        handleTextToSpeech(slides[nextSlide].description);
      }
    } else if (onComplete) {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentSlideRef.current > 0) {
      const prevSlide = currentSlideRef.current - 1;
      currentSlideRef.current = prevSlide;
      setCurrentSlide(prevSlide);
      if (isReadAloudEnabled) {
        handleTextToSpeech(slides[prevSlide].description);
      }
    }
  };

  const handleAskAI = () => {
    setLocation("/ai-tutor");
  };

  const handleTextToSpeech = (text: string) => {
    if (!isReadAloudEnabled) {
      return;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const langMap: Record<string, string> = {
        en: "en-US",
        te: "te-IN",
        hi: "hi-IN",
      };
      utterance.lang = langMap[language] || "en-US";
      utterance.rate = 0.5;
      utterance.pitch = 0.9;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      
      // Set language based on selected language
      const langMap: Record<string, string> = {
        en: "en-US",
        te: "te-IN",
        hi: "hi-IN",
      };
      recognitionInstance.lang = langMap[language] || "en-US";

      recognitionInstance.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        
        if (lastResultIndex <= lastProcessedIndexRef.current) {
          return;
        }
        
        const lastResult = event.results[lastResultIndex];
        if (!lastResult.isFinal) {
          const interimTranscript = lastResult[0].transcript.toLowerCase();
          setRecognizedText(interimTranscript);
          return;
        }
        
        lastProcessedIndexRef.current = lastResultIndex;
        const transcript = lastResult[0].transcript.toLowerCase();
        setRecognizedText(transcript);

        // Translate voice commands based on language
        const nextCommands = { en: ["next", "forward"], te: ["తర్వాత", "ముందుకు"], hi: ["अगला", "आगे"] };
        const prevCommands = { en: ["back", "previous"], te: ["వెనుకకు", "మునుపటి"], hi: ["पीछे", "पिछला"] };
        const repeatCommands = { en: ["repeat", "read again"], te: ["పునరావృత్తి", "మళ్లీ చదవండి"], hi: ["दोहराएं", "फिर से पढ़ें"] };
        const helpCommands = { en: ["help", "ai tutor"], te: ["సహాయం", "ai ట్యూటర్"], hi: ["मदद", "ai ट्यूटर"] };

        const allNext = (nextCommands[language as keyof typeof nextCommands] || nextCommands.en);
        const allPrev = (prevCommands[language as keyof typeof prevCommands] || prevCommands.en);
        const allRepeat = (repeatCommands[language as keyof typeof repeatCommands] || repeatCommands.en);
        const allHelp = (helpCommands[language as keyof typeof helpCommands] || helpCommands.en);

        if (allNext.some(cmd => transcript.includes(cmd))) {
          handleNext();
          setTimeout(() => setRecognizedText(""), 2000);
        } else if (allPrev.some(cmd => transcript.includes(cmd))) {
          handlePrevious();
          setTimeout(() => setRecognizedText(""), 2000);
        } else if (allRepeat.some(cmd => transcript.includes(cmd))) {
          handleTextToSpeech(slides[currentSlideRef.current].description);
          setTimeout(() => setRecognizedText(""), 2000);
        } else if (allHelp.some(cmd => transcript.includes(cmd))) {
          handleAskAI();
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          alert("Microphone permission denied. Please allow microphone access in your browser settings.");
        }
      };

      recognitionInstance.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.error("Error restarting recognition:", e);
            setIsListening(false);
            shouldListenRef.current = false;
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognitionInstance;
    }

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Recognition may already be stopped
        }
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleVoiceCommand = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      try {
        shouldListenRef.current = false;
        recognitionRef.current.stop();
        setIsListening(false);
        setRecognizedText("");
        lastProcessedIndexRef.current = -1;
      } catch (e) {
        console.error("Error stopping recognition:", e);
        setIsListening(false);
        shouldListenRef.current = false;
      }
    } else {
      try {
        lastProcessedIndexRef.current = -1;
        shouldListenRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting recognition:", e);
        shouldListenRef.current = false;
        alert("Could not start voice recognition. Please make sure microphone permissions are granted.");
      }
    }
  };

  useEffect(() => {
    currentSlideRef.current = currentSlide;
  }, [currentSlide]);

  const progress = ((currentSlide + 1) / slides.length) * 100;
  const slide = slides[currentSlide];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 flex items-center justify-center">{appIcon}</div>
          <div>
            <h2 className="text-3xl font-bold">{appName} Tutorial</h2>
            <p className="text-lg text-muted-foreground">
              Step {currentSlide + 1} of {slides.length}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="lg"
            variant={isReadAloudEnabled ? "default" : "outline"}
            className="h-14 px-6 text-lg"
            onClick={() => setIsReadAloudEnabled(!isReadAloudEnabled)}
            data-testid="button-toggle-read-aloud"
            title={isReadAloudEnabled ? "Read aloud is ON" : "Read aloud is OFF"}
          >
            <Volume2 className="mr-2 h-5 w-5" />
            {isReadAloudEnabled ? "Read ON" : "Read OFF"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-8 text-lg gap-3"
            onClick={handleAskAI}
            data-testid="button-ask-ai-tutor"
          >
            <MessageCircle className="h-6 w-6" />
            Ask AI Tutor
          </Button>
        </div>
      </div>

      <Progress value={progress} className="h-3" />

      <Card className="border-2">
        <CardContent className="pt-8 space-y-8">
          <div>
            <h3 className="text-3xl font-bold mb-4">{slide.title}</h3>
            <p className="text-2xl leading-relaxed text-muted-foreground">{slide.description}</p>
          </div>

          {slide.image && (
            <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
              <img
                src={slide.image}
                alt={slide.title}
                className="max-w-full max-h-96 rounded-lg"
              />
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-2xl font-semibold">Steps to Follow:</h4>
            {slide.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  {index + 1}
                </div>
                <p className="text-xl leading-relaxed pt-1">{step}</p>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-lg gap-3"
            onClick={() => handleTextToSpeech(slide.description)}
            disabled={!isReadAloudEnabled}
            data-testid="button-read-aloud"
            title={isReadAloudEnabled ? "Click to read this step aloud" : "Read aloud is disabled"}
          >
            <Volume2 className="h-6 w-6" />
            {isReadAloudEnabled ? "Read This Step Aloud" : "Read Aloud (Disabled)"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            size="lg"
            variant="outline"
            className="h-16 px-8 text-xl flex-1"
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            data-testid="button-previous"
          >
            <ChevronLeft className="h-6 w-6 mr-2" />
            Previous
          </Button>
          <Button
            size="lg"
            className={`h-16 px-8 text-xl flex-1 ${isListening ? "bg-destructive hover:bg-destructive/90" : ""}`}
            onClick={toggleVoiceCommand}
            data-testid="button-voice-command"
          >
            {isListening ? (
              <>
                <MicOff className="h-6 w-6 mr-2" />
                Stop Voice Commands
              </>
            ) : (
              <>
                <Mic className="h-6 w-6 mr-2" />
                Enable Voice Commands
              </>
            )}
          </Button>
          <Button
            size="lg"
            className="h-16 px-8 text-xl flex-1"
            onClick={handleNext}
            data-testid="button-next"
          >
            {currentSlide === slides.length - 1 ? (
              <>
                Complete
                <Check className="h-6 w-6 ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-6 w-6 ml-2" />
              </>
            )}
          </Button>
        </div>

        {isListening && (
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Mic className="h-6 w-6 text-primary animate-pulse" />
                <Badge className="text-base px-4 py-2">Listening...</Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-3">Try saying:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Next",
                  "Previous",
                  "Read again",
                  "Ask AI Tutor",
                ].map((command, index) => (
                  <Badge key={index} variant="outline" className="text-base px-4 py-2 justify-start">
                    "{command}"
                  </Badge>
                ))}
              </div>
              {recognizedText && (
                <div className="mt-4 p-3 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">You said:</p>
                  <p className="text-lg">{recognizedText}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
