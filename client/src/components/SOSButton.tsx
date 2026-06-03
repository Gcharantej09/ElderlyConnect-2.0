import { useState } from "react";
import { useLocation } from "wouter";
import { HelpCircle, BookOpen, MessageCircle, Mail, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SOSButton() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const go = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 text-xl"
            data-testid="button-sos"
            aria-label="Help"
          >
            <HelpCircle className="h-8 w-8" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Need Help?</DialogTitle>
            <DialogDescription className="text-lg leading-relaxed">
              Don't worry! I'm here to help you. What would you like assistance with?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              data-testid="button-help-tutorial"
              onClick={() => go("/learning")}
            >
              <BookOpen className="h-6 w-6" />
              Start a Tutorial
            </Button>
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              data-testid="button-help-ai"
              onClick={() => go("/ai-tutor")}
            >
              <MessageCircle className="h-6 w-6" />
              Talk to AI Assistant
            </Button>
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              data-testid="button-help-privacy"
              onClick={() => go("/privacy")}
            >
              <HelpCircle className="h-6 w-6" />
              Learn About Online Safety
            </Button>
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              data-testid="button-help-contact"
              onClick={() => {
                setOpen(false);
                setContactOpen(true);
              }}
            >
              <Phone className="h-6 w-6" />
              Contact Support
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Contact Support</DialogTitle>
            <DialogDescription className="text-lg leading-relaxed">
              Our team is here to help you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-secondary/20 rounded-lg border-2 border-secondary flex items-center gap-4">
              <Mail className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-lg font-semibold">Email</p>
                <a
                  href="mailto:support@elderlyconnect.app"
                  className="text-lg text-muted-foreground hover:underline"
                >
                  support@elderlyconnect.app
                </a>
              </div>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary flex items-center gap-4">
              <Phone className="h-8 w-8 text-primary" />
              <div>
                <p className="text-lg font-semibold">Phone</p>
                <p className="text-lg text-muted-foreground">1-800-555-0199 (9am–6pm)</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full h-14 text-lg"
              onClick={() => setContactOpen(false)}
              data-testid="button-contact-close"
            >
              <X className="mr-2 h-5 w-5" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
