import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, MessageCircle, Calendar } from "lucide-react";
import { useLocation } from "wouter";

type ConversationSummary = {
  id: string;
  title: string;
  topic?: string;
  createdAt: string;
  messageCount?: number;
};

export default function ConversationHistory() {
  const [, setLocation] = useLocation();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/conversations", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      try {
        const response = await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (response.ok) {
          setConversations(conversations.filter((c) => c.id !== id));
        }
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="lg"
            className="text-xl"
            onClick={() => setLocation("/guest")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-6 w-6" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">My Learning Sessions</h1>
          <div className="w-32" />
        </div>
      </header>

      <div className="flex-1 container mx-auto px-6 py-8 max-w-5xl">
        {isLoading ? (
          <Card className="p-12 text-center">
            <p className="text-2xl text-muted-foreground">Loading your sessions...</p>
          </Card>
        ) : conversations.length === 0 ? (
          <Card className="p-12 text-center border-2">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-2xl font-semibold mb-2">No Learning Sessions Yet</p>
            <p className="text-xl text-muted-foreground mb-6">
              Start chatting with the AI Tutor to save your learning sessions!
            </p>
            <Button
              size="lg"
              onClick={() => setLocation("/ai-tutor")}
              data-testid="button-start-learning"
            >
              Go to AI Tutor
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="mb-6">
              <p className="text-xl text-muted-foreground">
                You have {conversations.length} learning session{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>

            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer hover-elevate"
                onClick={() => setLocation(`/ai-tutor?id=${conversation.id}`)}
                data-testid={`card-conversation-${conversation.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold mb-2">{conversation.title}</h3>
                    <div className="flex items-center gap-6 text-lg text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        <span>{formatDate(conversation.createdAt)}</span>
                      </div>
                      {conversation.topic && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5" />
                          <span>{conversation.topic}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conversation.id);
                    }}
                    data-testid={`button-delete-${conversation.id}`}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-6 w-6" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
