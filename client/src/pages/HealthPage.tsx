import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Pill,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Heart,
  Activity,
  Watch,
  FileText,
  Youtube,
  Dumbbell,
  Salad,
  Brain,
  Wind,
  ExternalLink,
  Save,
  AlertCircle,
  Lightbulb,
  Clock,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  time: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
};

type HealthReport = {
  id: string;
  title: string;
  summary: string | null;
  heartRate: number | null;
  bloodPressure: string | null;
  bloodOxygen: number | null;
  weight: string | null;
  notes: string | null;
  recordedAt: string;
};

type VideoLink = {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string | null;
  createdAt: string;
};

const COMMON_MEDS_SUGGESTIONS = [
  "Aspirin (low dose)",
  "Blood pressure tablet",
  "Diabetes tablet (Metformin)",
  "Cholesterol tablet (Atorvastatin)",
  "Calcium + Vitamin D",
  "Vitamin B12",
  "Thyroid tablet (Levothyroxine)",
  "Omega-3 / Fish oil",
];

const CATEGORIES: { value: string; label: string; icon: any; color: string }[] = [
  { value: "health", label: "Health", icon: Heart, color: "text-red-500" },
  { value: "diet", label: "Diet", icon: Salad, color: "text-green-500" },
  { value: "yoga", label: "Yoga", icon: Activity, color: "text-purple-500" },
  { value: "meditation", label: "Meditation", icon: Brain, color: "text-indigo-500" },
  { value: "exercise", label: "Exercise", icon: Dumbbell, color: "text-orange-500" },
  { value: "breathing", label: "Breathing", icon: Wind, color: "text-cyan-500" },
];

function categoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? { value, label: value, icon: Youtube, color: "text-gray-500" };
}

function youtubeIdFromUrl(url: string): string | null {
  // Accept full youtube URLs and youtu.be short links; return the id for embedding
  const m1 = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
  if (m1) return m1[1];
  const m2 = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m2) return m2[1];
  return null;
}

export default function HealthPage() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [meds, setMeds] = useState<Medication[]>([]);
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [videos, setVideos] = useState<VideoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("health");

  // Medication form state
  const [medFormOpen, setMedFormOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Partial<Medication> | null>(null);
  const [medSubmitting, setMedSubmitting] = useState(false);

  // Health report form state
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: "",
    summary: "",
    heartRate: "",
    bloodPressure: "",
    bloodOxygen: "",
    weight: "",
    notes: "",
  });
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Video link form state
  const [videoFormOpen, setVideoFormOpen] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: "",
    url: "",
    category: "health",
    description: "",
  });
  const [videoSubmitting, setVideoSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) void loadAll();
  }, [isAuthenticated]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [m, r, v] = await Promise.all([
        fetch("/api/medications", { credentials: "include" }).then((res) => (res.ok ? res.json() : [])),
        fetch("/api/health-reports", { credentials: "include" }).then((res) => (res.ok ? res.json() : [])),
        fetch("/api/video-links", { credentials: "include" }).then((res) => (res.ok ? res.json() : [])),
      ]);
      setMeds(Array.isArray(m) ? m : []);
      setReports(Array.isArray(r) ? r : []);
      setVideos(Array.isArray(v) ? v : []);
    } catch (err) {
      setError("Could not load your health data.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Medications ----
  function openNewMed() {
    setEditingMed({ name: "", dosage: "", frequency: "", time: "", notes: "", active: true });
    setMedFormOpen(true);
  }
  function openEditMed(m: Medication) {
    setEditingMed({ ...m });
    setMedFormOpen(true);
  }
  async function saveMed() {
    if (!editingMed?.name?.trim()) return;
    setMedSubmitting(true);
    const payload = {
      name: editingMed.name.trim(),
      dosage: editingMed.dosage || null,
      frequency: editingMed.frequency || null,
      time: editingMed.time || null,
      notes: editingMed.notes || null,
      active: editingMed.active !== false,
    };
    try {
      if (editingMed.id) {
        const res = await fetch(`/api/medications/${editingMed.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setMeds((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          setMedFormOpen(false);
        }
      } else {
        const res = await fetch("/api/medications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setMeds((prev) => [created, ...prev]);
          setMedFormOpen(false);
        }
      }
    } finally {
      setMedSubmitting(false);
    }
  }
  async function deleteMed(id: string) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
    try {
      await fetch(`/api/medications/${id}`, { method: "DELETE", credentials: "include" });
    } catch {
      /* ignore */
    }
  }
  function addSuggestion(suggestion: string) {
    setEditingMed({ name: suggestion, dosage: "", frequency: "", time: "", notes: "", active: true });
    setMedFormOpen(true);
  }

  // ---- Health reports ----
  async function saveReport() {
    if (!reportForm.title.trim()) return;
    setReportSubmitting(true);
    try {
      const res = await fetch("/api/health-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: reportForm.title.trim(),
          summary: reportForm.summary || null,
          heartRate: reportForm.heartRate ? Number(reportForm.heartRate) : null,
          bloodPressure: reportForm.bloodPressure || null,
          bloodOxygen: reportForm.bloodOxygen ? Number(reportForm.bloodOxygen) : null,
          weight: reportForm.weight || null,
          notes: reportForm.notes || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setReports((prev) => [created, ...prev]);
        setReportForm({
          title: "",
          summary: "",
          heartRate: "",
          bloodPressure: "",
          bloodOxygen: "",
          weight: "",
          notes: "",
        });
        setReportFormOpen(false);
      }
    } finally {
      setReportSubmitting(false);
    }
  }
  async function deleteReport(id: string) {
    setReports((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/health-reports/${id}`, { method: "DELETE", credentials: "include" });
    } catch {
      /* ignore */
    }
  }

  // ---- Video links ----
  async function saveVideo() {
    if (!videoForm.title.trim() || !videoForm.url.trim()) return;
    setVideoSubmitting(true);
    try {
      const res = await fetch("/api/video-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: videoForm.title.trim(),
          url: videoForm.url.trim(),
          category: videoForm.category,
          description: videoForm.description || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setVideos((prev) => [created, ...prev]);
        setVideoForm({ title: "", url: "", category: "health", description: "" });
        setVideoFormOpen(false);
        setActiveCategory(created.category);
      }
    } finally {
      setVideoSubmitting(false);
    }
  }
  async function deleteVideo(id: string) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    try {
      await fetch(`/api/video-links/${id}`, { method: "DELETE", credentials: "include" });
    } catch {
      /* ignore */
    }
  }

  const visibleVideos = videos.filter((v) => v.category === activeCategory);
  const activeMeds = meds.filter((m) => m.active);
  const inactiveMeds = meds.filter((m) => !m.active);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <Heart className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Sign in to use Health</h2>
          <p className="text-base text-muted-foreground mb-4">
            Save your medications, health reports, and watch lists to your account.
          </p>
          <Button onClick={() => setLocation("/auth")}>Sign in</Button>
        </Card>
      </div>
    );
  }

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
              <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold">Health</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/smartwatch")}
              data-testid="button-smartwatch"
            >
              <Watch className="mr-2 h-5 w-5" /> Smartwatch
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-6xl space-y-8">
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* ===== MEDICATIONS ===== */}
        <Card data-testid="section-medications">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Pill className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">My Medications</CardTitle>
                  <CardDescription>
                    Medicines you take regularly. Your doctor should always be your final guide.
                  </CardDescription>
                </div>
              </div>
              <Button onClick={openNewMed} data-testid="button-add-medication">
                <Plus className="mr-2 h-5 w-5" /> Add medication
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-6 text-center">Loading...</p>
            ) : activeMeds.length === 0 && inactiveMeds.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-lg text-muted-foreground mb-3">
                  You have not added any medicines yet.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Pick a common medicine below, or add your own.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {COMMON_MEDS_SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => addSuggestion(s)}
                      data-testid={`suggestion-${s}`}
                    >
                      + {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3" data-testid="list-medications">
                {activeMeds.map((m) => (
                  <MedicationRow
                    key={m.id}
                    m={m}
                    onEdit={() => openEditMed(m)}
                    onDelete={() => deleteMed(m.id)}
                    onToggle={async () => {
                      const res = await fetch(`/api/medications/${m.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ active: !m.active }),
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setMeds((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                      }
                    }}
                  />
                ))}
                {activeMeds.length > 0 && inactiveMeds.length > 0 && (
                  <p className="text-sm text-muted-foreground pt-3">Stopped medicines</p>
                )}
                {inactiveMeds.map((m) => (
                  <MedicationRow
                    key={m.id}
                    m={m}
                    onEdit={() => openEditMed(m)}
                    onDelete={() => deleteMed(m.id)}
                    onToggle={async () => {
                      const res = await fetch(`/api/medications/${m.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ active: !m.active }),
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setMeds((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                      }
                    }}
                  />
                ))}
                {activeMeds.length < 3 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" /> Add another common medicine:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_MEDS_SUGGESTIONS.filter(
                        (s) => !activeMeds.some((m) => m.name.toLowerCase() === s.toLowerCase()),
                      ).map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          onClick={() => addSuggestion(s)}
                        >
                          + {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== HEALTH REPORTS ===== */}
        <Card data-testid="section-reports">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Health Reports</CardTitle>
                  <CardDescription>
                    Save your check-up results so you can show them to your doctor later.
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => setReportFormOpen(true)} data-testid="button-add-report">
                <Plus className="mr-2 h-5 w-5" /> New report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-6 text-center">Loading...</p>
            ) : reports.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg text-muted-foreground mb-2">No health reports yet</p>
                <p className="text-sm text-muted-foreground">
                  Add a quick report after each doctor visit (date, heart rate, BP, weight, anything).
                </p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="list-reports">
                {reports.map((r) => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold">{r.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(r.recordedAt).toLocaleString()}
                        </p>
                        {r.summary && (
                          <p className="text-base mt-2">{r.summary}</p>
                        )}
                        <div className="flex gap-2 flex-wrap mt-2">
                          {r.heartRate != null && (
                            <Badge variant="secondary">
                              <Heart className="h-3 w-3 mr-1" /> {r.heartRate} bpm
                            </Badge>
                          )}
                          {r.bloodPressure && (
                            <Badge variant="secondary">BP {r.bloodPressure}</Badge>
                          )}
                          {r.bloodOxygen != null && (
                            <Badge variant="secondary">SpO₂ {r.bloodOxygen}%</Badge>
                          )}
                          {r.weight && (
                            <Badge variant="secondary">Weight {r.weight}</Badge>
                          )}
                        </div>
                        {r.notes && (
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                            {r.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteReport(r.id)}
                        data-testid={`button-delete-report-${r.id}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== VIDEO LINKS ===== */}
        <Card data-testid="section-videos">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
                  <Youtube className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Health Videos</CardTitle>
                  <CardDescription>
                    YouTube videos about health, diet, yoga, meditation, breathing, and exercise.
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => setVideoFormOpen(true)} data-testid="button-add-video">
                <Plus className="mr-2 h-5 w-5" /> Add video
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap pt-3">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const count = videos.filter((v) => v.category === c.value).length;
                return (
                  <Button
                    key={c.value}
                    variant={activeCategory === c.value ? "default" : "outline"}
                    onClick={() => setActiveCategory(c.value)}
                    data-testid={`category-${c.value}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {c.label} ({count})
                  </Button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-6 text-center">Loading...</p>
            ) : visibleVideos.length === 0 ? (
              <div className="py-8 text-center">
                <Youtube className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg text-muted-foreground mb-2">
                  No videos saved in {categoryMeta(activeCategory).label} yet
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Paste a YouTube link and we will save it for you.
                </p>
                <Button onClick={() => setVideoFormOpen(true)}>
                  <Plus className="mr-2 h-5 w-5" /> Add a {categoryMeta(activeCategory).label} video
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4" data-testid="list-videos">
                {visibleVideos.map((v) => {
                  const id = youtubeIdFromUrl(v.url);
                  return (
                    <Card key={v.id} className="overflow-hidden">
                      {id ? (
                        <div className="aspect-video bg-black">
                          <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${id}`}
                            title={v.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <Youtube className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold line-clamp-2">{v.title}</h3>
                            {v.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {v.description}
                              </p>
                            )}
                            <a
                              href={v.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary inline-flex items-center gap-1 mt-2 hover:underline"
                            >
                              Open on YouTube <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteVideo(v.id)}
                            data-testid={`button-delete-video-${v.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center pb-6">
          Safety tip: ElderlyConnect is a learning helper, not a doctor. Always confirm medicines and treatments with your physician.
        </p>
      </div>

      {/* ===== MED FORM MODAL ===== */}
      {medFormOpen && editingMed && (
        <ModalShell onClose={() => setMedFormOpen(false)} title={editingMed.id ? "Edit medication" : "Add medication"}>
          <div className="space-y-4">
            <Field label="Medicine name">
              <Input
                value={editingMed.name || ""}
                onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })}
                placeholder="e.g., Atorvastatin"
                data-testid="input-med-name"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dosage">
                <Input
                  value={editingMed.dosage || ""}
                  onChange={(e) => setEditingMed({ ...editingMed, dosage: e.target.value })}
                  placeholder="e.g., 10 mg"
                  data-testid="input-med-dosage"
                />
              </Field>
              <Field label="Frequency">
                <Input
                  value={editingMed.frequency || ""}
                  onChange={(e) => setEditingMed({ ...editingMed, frequency: e.target.value })}
                  placeholder="e.g., Once a day"
                  data-testid="input-med-frequency"
                />
              </Field>
            </div>
            <Field label="Time of day (optional)">
              <Input
                type="time"
                value={editingMed.time || ""}
                onChange={(e) => setEditingMed({ ...editingMed, time: e.target.value })}
                data-testid="input-med-time"
              />
            </Field>
            <Field label="Notes (optional)">
              <Input
                value={editingMed.notes || ""}
                onChange={(e) => setEditingMed({ ...editingMed, notes: e.target.value })}
                placeholder="e.g., Take with food"
                data-testid="input-med-notes"
              />
            </Field>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingMed.active !== false}
                onChange={(e) => setEditingMed({ ...editingMed, active: e.target.checked })}
              />
              <span>I am currently taking this medicine</span>
            </label>
            <ModalActions
              onClose={() => setMedFormOpen(false)}
              onSave={saveMed}
              saving={medSubmitting}
              saveLabel={editingMed.id ? "Save changes" : "Add medicine"}
              canSave={!!editingMed.name?.trim()}
            />
          </div>
        </ModalShell>
      )}

      {/* ===== REPORT FORM MODAL ===== */}
      {reportFormOpen && (
        <ModalShell onClose={() => setReportFormOpen(false)} title="New health report">
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={reportForm.title}
                onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                placeholder="e.g., Annual check-up — March 2026"
                data-testid="input-report-title"
              />
            </Field>
            <Field label="Summary (optional)">
              <Input
                value={reportForm.summary}
                onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })}
                placeholder="e.g., Overall doctor said I am in good shape"
                data-testid="input-report-summary"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heart rate (bpm)">
                <Input
                  type="number"
                  value={reportForm.heartRate}
                  onChange={(e) => setReportForm({ ...reportForm, heartRate: e.target.value })}
                  data-testid="input-report-hr"
                />
              </Field>
              <Field label="Blood oxygen (%)">
                <Input
                  type="number"
                  value={reportForm.bloodOxygen}
                  onChange={(e) => setReportForm({ ...reportForm, bloodOxygen: e.target.value })}
                  data-testid="input-report-spo2"
                />
              </Field>
              <Field label="Blood pressure (e.g., 120/80)">
                <Input
                  value={reportForm.bloodPressure}
                  onChange={(e) => setReportForm({ ...reportForm, bloodPressure: e.target.value })}
                  data-testid="input-report-bp"
                />
              </Field>
              <Field label="Weight (e.g., 70 kg)">
                <Input
                  value={reportForm.weight}
                  onChange={(e) => setReportForm({ ...reportForm, weight: e.target.value })}
                  data-testid="input-report-weight"
                />
              </Field>
            </div>
            <Field label="Doctor's notes (optional)">
              <Input
                value={reportForm.notes}
                onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                placeholder="Anything your doctor told you to remember"
                data-testid="input-report-notes"
              />
            </Field>
            <ModalActions
              onClose={() => setReportFormOpen(false)}
              onSave={saveReport}
              saving={reportSubmitting}
              saveLabel="Save report"
              canSave={!!reportForm.title.trim()}
            />
          </div>
        </ModalShell>
      )}

      {/* ===== VIDEO FORM MODAL ===== */}
      {videoFormOpen && (
        <ModalShell onClose={() => setVideoFormOpen(false)} title="Add YouTube video">
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="e.g., 10 min Yoga for seniors"
                data-testid="input-video-title"
              />
            </Field>
            <Field label="YouTube URL">
              <Input
                value={videoForm.url}
                onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                data-testid="input-video-url"
              />
            </Field>
            <Field label="Category">
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setVideoForm({ ...videoForm, category: c.value })}
                      className={`p-3 rounded-lg border-2 text-left ${
                        videoForm.category === c.value
                          ? "border-primary bg-primary/10"
                          : "border-muted"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${c.color}`} />
                      <p className="text-sm font-semibold mt-1">{c.label}</p>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Description (optional)">
              <Input
                value={videoForm.description}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                placeholder="Why is this video helpful?"
                data-testid="input-video-desc"
              />
            </Field>
            <ModalActions
              onClose={() => setVideoFormOpen(false)}
              onSave={saveVideo}
              saving={videoSubmitting}
              saveLabel="Save video"
              canSave={!!videoForm.title.trim() && !!videoForm.url.trim()}
            />
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function MedicationRow({
  m,
  onEdit,
  onDelete,
  onToggle,
}: {
  m: Medication;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`p-4 rounded-lg border-2 ${m.active ? "bg-background" : "bg-muted/40 opacity-70"}`}
      data-testid={`medication-${m.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
          <Pill className="h-5 w-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold">{m.name}</h3>
            {!m.active && <Badge variant="outline">Stopped</Badge>}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {m.dosage && <Badge variant="secondary">{m.dosage}</Badge>}
            {m.frequency && <Badge variant="outline">{m.frequency}</Badge>}
            {m.time && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" /> {m.time}
              </Badge>
            )}
          </div>
          {m.notes && (
            <p className="text-sm text-muted-foreground mt-1">{m.notes}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant={m.active ? "outline" : "default"}
            onClick={onToggle}
            title={m.active ? "Mark as stopped" : "Mark as active"}
            data-testid={`button-toggle-med-${m.id}`}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onEdit}
            data-testid={`button-edit-med-${m.id}`}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            data-testid={`button-delete-med-${m.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-base font-semibold block mb-2">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({
  onClose,
  onSave,
  saving,
  saveLabel,
  canSave,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  canSave: boolean;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button
        size="lg"
        onClick={onSave}
        disabled={!canSave || saving}
        className="flex-1"
        data-testid="button-modal-save"
      >
        <Save className="mr-2 h-5 w-5" />
        {saveLabel}
      </Button>
      <Button size="lg" variant="outline" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}
