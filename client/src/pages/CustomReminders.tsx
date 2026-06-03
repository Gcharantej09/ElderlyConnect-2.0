import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Pencil,
  Bell,
  Clock,
  Pill,
  Dumbbell,
  Droplets,
  Coffee,
  Phone,
  Calendar,
  ListTodo,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
};

const REMINDER_TYPES = [
  { value: "task", label: "Task", icon: ListTodo, color: "bg-blue-500" },
  { value: "medication", label: "Medicine", icon: Pill, color: "bg-red-500" },
  { value: "exercise", label: "Exercise", icon: Dumbbell, color: "bg-green-500" },
  { value: "water", label: "Drink water", icon: Droplets, color: "bg-cyan-500" },
  { value: "meal", label: "Meal", icon: Coffee, color: "bg-amber-500" },
  { value: "call", label: "Call someone", icon: Phone, color: "bg-purple-500" },
  { value: "appointment", label: "Appointment", icon: Calendar, color: "bg-indigo-500" },
  { value: "walk", label: "Walk", icon: Dumbbell, color: "bg-emerald-500" },
  { value: "other", label: "Other", icon: Clock, color: "bg-gray-500" },
];

const TYPE_LOOKUP: Record<string, (typeof REMINDER_TYPES)[number]> = REMINDER_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t }),
  {} as Record<string, (typeof REMINDER_TYPES)[number]>,
);

function getTypeMeta(type: string) {
  return TYPE_LOOKUP[type] ?? TYPE_LOOKUP.other;
}

type EditingState = {
  id: string | null;
  title: string;
  description: string;
  type: string;
  time: string;
};

const emptyEditing: EditingState = {
  id: null,
  title: "",
  description: "",
  type: "task",
  time: "",
};

export default function CustomReminders() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState>(emptyEditing);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reminders", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReminders(Array.isArray(data) ? data : []);
      } else {
        setError("Could not load your reminders.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(emptyEditing);
    setFormOpen(true);
  }

  function openEdit(r: Reminder) {
    const timeMatch = (r.description || "").match(/At (\d{2}:\d{2})/);
    setEditing({
      id: r.id,
      title: r.title,
      description: timeMatch ? "" : r.description || "",
      type: r.type,
      time: timeMatch ? timeMatch[1] : "",
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!editing.title.trim()) return;
    setSubmitting(true);
    const description = editing.time
      ? (editing.description ? `${editing.description} · ` : "") + `At ${editing.time}`
      : editing.description.trim() || null;
    try {
      if (editing.id) {
        const res = await fetch(`/api/reminders/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: editing.title.trim(),
            description,
            type: editing.type,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setFormOpen(false);
        } else {
          setError("Could not update reminder.");
        }
      } else {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: editing.title.trim(),
            type: editing.type,
            description,
            completed: false,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setReminders((prev) => [created, ...prev]);
          setFormOpen(false);
        } else {
          setError("Could not save reminder.");
        }
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleComplete(r: Reminder) {
    const newValue = !r.completed;
    setReminders((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, completed: newValue, completedAt: newValue ? new Date().toISOString() : null } : x)),
    );
    try {
      const res = await fetch(`/api/reminders/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed: newValue }),
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      // Revert
      setReminders((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, completed: r.completed, completedAt: r.completedAt } : x)),
      );
    }
  }

  async function handleDelete(id: string) {
    const target = reminders.find((r) => r.id === id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && target) {
        // Put it back if delete failed
        setReminders((prev) => [target, ...prev]);
      }
    } catch (err) {
      if (target) setReminders((prev) => [target, ...prev]);
    }
  }

  const visible = reminders.filter((r) => {
    if (filter === "active") return !r.completed;
    if (filter === "done") return r.completed;
    return true;
  });

  const activeCount = reminders.filter((r) => !r.completed).length;
  const doneCount = reminders.filter((r) => r.completed).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold">Custom Reminders</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button size="lg" onClick={openCreate} data-testid="button-add-reminder">
              <Plus className="mr-2 h-5 w-5" />
              New Reminder
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-4xl font-bold" data-testid="text-active-count">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-4xl font-bold" data-testid="text-done-count">{doneCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-4xl font-bold" data-testid="text-total-count">{reminders.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            data-testid="filter-all"
          >
            All ({reminders.length})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            data-testid="filter-active"
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={filter === "done" ? "default" : "outline"}
            onClick={() => setFilter("done")}
            data-testid="filter-done"
          >
            Completed ({doneCount})
          </Button>
        </div>

        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="pt-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {!isAuthenticated ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-2xl mb-2">Sign in to use reminders</p>
              <p className="text-base text-muted-foreground mb-4">
                Your reminders are saved to your account.
              </p>
              <Button onClick={() => setLocation("/auth")}>Sign in</Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading reminders...</CardContent>
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <ListTodo className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-2xl mb-2">No reminders yet</p>
              <p className="text-base text-muted-foreground mb-4">
                Create reminders for any task — call family, water plants, doctor visit, anything.
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-5 w-5" /> Create your first reminder
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="list-reminders">
            {visible.map((r) => {
              const meta = getTypeMeta(r.type);
              const Icon = meta.icon;
              return (
                <Card
                  key={r.id}
                  className={`p-5 ${r.completed ? "opacity-60" : ""}`}
                  data-testid={`card-reminder-${r.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-lg ${meta.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3
                          className={`text-xl font-semibold ${r.completed ? "line-through" : ""}`}
                        >
                          {r.title}
                        </h3>
                        <Badge variant="outline" className="capitalize">{meta.label}</Badge>
                      </div>
                      {r.description && (
                        <p className="text-base text-muted-foreground">{r.description}</p>
                      )}
                      {r.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Done {new Date(r.completedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant={r.completed ? "outline" : "default"}
                        onClick={() => toggleComplete(r)}
                        data-testid={`button-toggle-${r.id}`}
                        title={r.completed ? "Mark as not done" : "Mark as done"}
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openEdit(r)}
                        data-testid={`button-edit-${r.id}`}
                        title="Edit"
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(r.id)}
                        data-testid={`button-delete-${r.id}`}
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4"
          onClick={() => setFormOpen(false)}
        >
          <Card
            className="w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
            data-testid="form-reminder"
          >
            <CardHeader className="p-0 mb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {editing.id ? "Edit Reminder" : "New Reminder"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>
                Add a task for yourself. You can set a time if you want.
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="text-base font-semibold block mb-2">Title</label>
                <Input
                  placeholder="e.g., Call my daughter"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="text-lg py-3"
                  data-testid="input-reminder-title"
                />
              </div>
              <div>
                <label className="text-base font-semibold block mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {REMINDER_TYPES.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditing({ ...editing, type: opt.value })}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          editing.type === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-muted hover:border-primary/50"
                        }`}
                        data-testid={`type-${opt.value}`}
                      >
                        <Icon className="h-5 w-5 mb-1" />
                        <p className="text-sm font-semibold">{opt.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-base font-semibold block mb-2">Time (optional)</label>
                <Input
                  type="time"
                  value={editing.time}
                  onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                  className="text-lg py-3"
                  data-testid="input-reminder-time"
                />
              </div>
              <div>
                <label className="text-base font-semibold block mb-2">Note (optional)</label>
                <Input
                  placeholder="e.g., Take with food"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="text-lg py-3"
                  data-testid="input-reminder-desc"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={!editing.title.trim() || submitting}
                  data-testid="button-save-reminder"
                  className="flex-1"
                >
                  <Save className="mr-2 h-5 w-5" />
                  {editing.id ? "Save changes" : "Create reminder"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
