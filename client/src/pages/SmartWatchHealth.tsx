import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Watch,
  Heart,
  Footprints,
  Droplets,
  Bell,
  Plus,
  Trash2,
  Activity,
  Clock,
  Bluetooth,
  BluetoothConnected,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  isWebBluetoothSupported,
  loadPairedDevices,
  persistDevice,
  scanAndConnect,
  startSimulator,
  syncHealthSample,
  unpairDevice,
  type BleDeviceInfo,
  type BleSample,
  type LiveDeviceHandle,
} from "@/lib/bluetooth";
import { useLanguage } from "@/contexts/LanguageContext";

type Reminder = {
  id: string;
  title: string;
  type: string;
  completed: boolean;
  description: string | null;
};

const REMINDER_TYPE_OPTIONS = [
  { value: "medication", label: "Medicine" },
  { value: "exercise", label: "Exercise" },
  { value: "water", label: "Drink Water" },
  { value: "meal", label: "Meal" },
  { value: "walk", label: "Walk" },
  { value: "other", label: "Other" },
];

export default function SmartWatchHealth() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [sample, setSample] = useState<BleSample | null>(null);
  const [device, setDevice] = useState<BleDeviceInfo | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderType, setReminderType] = useState("medication");
  const [reminderTime, setReminderTime] = useState("");
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [paired, setPaired] = useState<{ id: string; name: string; deviceId: string; lastSeenAt: string; services: string[] | null }[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);

  const handleRef = useRef<LiveDeviceHandle | null>(null);
  const dbDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    setAvailable(isWebBluetoothSupported());
    if (isAuthenticated) {
      void refreshReminders();
      void refreshPaired();
    }
    return () => {
      const h = handleRef.current;
      if (h) {
        h.disconnect().catch(() => {});
        handleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function refreshReminders() {
    setReminderLoading(true);
    try {
      const res = await fetch("/api/reminders", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReminders(Array.isArray(data) ? data : []);
      }
    } finally {
      setReminderLoading(false);
    }
  }

  async function refreshPaired() {
    try {
      const list = await loadPairedDevices();
      setPaired(list);
    } catch {
      setPaired([]);
    }
  }

  async function handleConnect() {
    setError(null);
    setStatus("connecting");
    try {
      if (handleRef.current) {
        await handleRef.current.disconnect();
        handleRef.current = null;
        setDevice(null);
        setStatus("idle");
        return;
      }
      let handle: LiveDeviceHandle;
      if (isWebBluetoothSupported()) {
        handle = await scanAndConnect((s) => {
          setSample(s);
          if (dbDeviceIdRef.current) {
            syncHealthSample(s, dbDeviceIdRef.current).catch(() => {});
          }
        });
      } else {
        handle = startSimulator((s) => {
          setSample(s);
          if (dbDeviceIdRef.current) {
            syncHealthSample(s, dbDeviceIdRef.current).catch(() => {});
          }
        });
      }
      handleRef.current = handle;
      setDevice(handle.info);

      if (isAuthenticated) {
        const saved = await persistDevice(handle.info);
        dbDeviceIdRef.current = saved.id;
        await refreshPaired();
      }
      setStatus("connected");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not connect to a device.");
      setDevice(null);
      handleRef.current = null;
    }
  }

  async function handleUnpair(id: string) {
    await unpairDevice(id).catch(() => {});
    await refreshPaired();
  }

  async function handleAddReminder() {
    if (!reminderTitle.trim()) return;
    const description = reminderTime ? `At ${reminderTime}` : null;
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: reminderTitle.trim(),
        type: reminderType,
        description,
      }),
    });
    if (res.ok) {
      setReminderTitle("");
      setReminderTime("");
      setShowAddReminder(false);
      await refreshReminders();
    } else if (res.status === 401) {
      setError("Please sign in to save reminders.");
    } else {
      setError("Could not save reminder. Try again.");
    }
  }

  async function handleDeleteReminder(id: string) {
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } else {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
  }

  const isConnected = status === "connected" && device != null;
  const stepsValue = sample?.steps ?? 0;
  const heartRateValue = sample?.heartRate ?? null;
  const batteryValue = sample?.batteryLevel ?? null;
  const spO2Value = sample?.bloodOxygen ?? null;

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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Watch className="h-8 w-8" />
            Smartwatch & Health
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/health")}
              data-testid="button-go-to-health"
            >
              Health Page
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-6 py-8 max-w-6xl">
        <Card className="mb-8 p-8 border-2">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Device Connection</h2>
              <p className="text-xl text-muted-foreground">
                {isConnected ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold inline-flex items-center gap-2">
                    <BluetoothConnected className="h-5 w-5" /> Connected to {device?.name}
                  </span>
                ) : status === "connecting" ? (
                  <span className="text-blue-600 inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Connecting...
                  </span>
                ) : (
                  <span className="text-gray-500">Not Connected</span>
                )}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleConnect}
              variant={isConnected ? "destructive" : "default"}
              data-testid="button-connect-watch"
              className="text-lg px-8 py-6"
              disabled={status === "connecting"}
            >
              {isConnected ? "Disconnect" : "Connect Device"}
            </Button>
          </div>
          {available === false && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              <strong>Heads up:</strong> Web Bluetooth is not available in this browser. Tap "Connect Device" to use the
              built-in simulator so you can still preview the feature. For real hardware, open this app in Chrome or
              Edge on a desktop, Android phone, or over HTTPS.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">
              {error}
            </p>
          )}
          {batteryValue != null && isConnected && (
            <p className="text-sm text-muted-foreground mt-2">Battery: {batteryValue}%</p>
          )}
        </Card>

        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 hover-elevate">
              <div className="flex items-center justify-between mb-4">
                <Footprints className="h-8 w-8 text-blue-600" />
                <Badge className="text-lg">Steps</Badge>
              </div>
              <p className="text-4xl font-bold mb-2">{stepsValue.toLocaleString()}</p>
              <p className="text-muted-foreground text-lg">Daily Goal: 10,000</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stepsValue / 10000) * 100)}%` }}
                />
              </div>
            </Card>
            <Card className="p-6 hover-elevate">
              <div className="flex items-center justify-between mb-4">
                <Heart className="h-8 w-8 text-red-600" />
                <Badge className="text-lg">Heart Rate</Badge>
              </div>
              <p className="text-4xl font-bold mb-2">
                {heartRateValue != null ? `${heartRateValue} bpm` : "—"}
              </p>
              <p className="text-muted-foreground text-lg">Normal: 60-100 bpm</p>
              <div className="mt-4 text-sm">
                {heartRateValue == null ? (
                  <span className="text-muted-foreground">Waiting for data...</span>
                ) : heartRateValue < 60 ? (
                  <span className="text-blue-600">Low - Rest more</span>
                ) : heartRateValue > 100 ? (
                  <span className="text-orange-600">High - Relax</span>
                ) : (
                  <span className="text-green-600">Healthy range</span>
                )}
              </div>
            </Card>
            <Card className="p-6 hover-elevate">
              <div className="flex items-center justify-between mb-4">
                <Droplets className="h-8 w-8 text-cyan-600" />
                <Badge className="text-lg">SpO₂</Badge>
              </div>
              <p className="text-4xl font-bold mb-2">{spO2Value != null ? `${spO2Value}%` : "—"}</p>
              <p className="text-muted-foreground text-lg">Blood Oxygen</p>
            </Card>
            <Card className="p-6 hover-elevate">
              <div className="flex items-center justify-between mb-4">
                <Activity className="h-8 w-8 text-purple-600" />
                <Badge className="text-lg">Live</Badge>
              </div>
              <p className="text-4xl font-bold mb-2">{sample ? new Date(sample.recordedAt).toLocaleTimeString() : "—"}</p>
              <p className="text-muted-foreground text-lg">Last update</p>
            </Card>
          </div>
        )}

        {isAuthenticated && paired.length > 0 && (
          <Card className="mb-8 p-6">
            <h3 className="text-2xl font-semibold mb-4 inline-flex items-center gap-2">
              <Bluetooth className="h-6 w-6" /> Paired devices
            </h3>
            <ul className="space-y-2">
              {paired.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-lg font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Services: {(p.services || []).join(", ") || "—"} · Last seen {new Date(p.lastSeenAt).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleUnpair(p.id)} data-testid={`button-unpair-${p.id}`}>
                    <Trash2 className="h-5 w-5" />
                    Forget
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Health Reminders
            </h2>
            <div className="flex gap-2">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/reminders")}
                data-testid="button-open-reminders-page"
              >
                Open Reminders Page
              </Button>
              <Button
                size="lg"
                onClick={() => setShowAddReminder(!showAddReminder)}
                data-testid="button-add-reminder"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Reminder
              </Button>
            </div>
          </div>

          {showAddReminder && (
            <Card className="p-6 border-2 border-primary">
              <h3 className="text-2xl font-semibold mb-4">Create New Reminder</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-lg font-semibold block mb-2">Reminder Title</label>
                  <Input
                    placeholder="e.g., Take Medicine, Drink Water, Walk"
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    className="text-lg py-3"
                    data-testid="input-reminder-title"
                  />
                </div>
                <div>
                  <label className="text-lg font-semibold block mb-2">Time (optional)</label>
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="text-lg py-3"
                    data-testid="input-reminder-time"
                  />
                </div>
                <div>
                  <label className="text-lg font-semibold block mb-2">Type</label>
                  <select
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value)}
                    className="w-full text-lg py-2 px-3 border rounded"
                  >
                    {REMINDER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <Button size="lg" onClick={handleAddReminder} data-testid="button-save-reminder">
                    Save Reminder
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setShowAddReminder(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {!isAuthenticated ? (
              <Card className="p-8 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-2xl text-muted-foreground">Sign in to save reminders</p>
                <p className="text-lg text-muted-foreground mt-2">
                  Reminders are saved to your account so they follow you across devices.
                </p>
                <Button className="mt-4" size="lg" onClick={() => setLocation("/auth")}>
                  Sign in
                </Button>
              </Card>
            ) : reminderLoading ? (
              <Card className="p-8 text-center text-muted-foreground">Loading reminders...</Card>
            ) : reminders.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-2xl text-muted-foreground">No reminders yet</p>
                <p className="text-lg text-muted-foreground mt-2">
                  Create health reminders to stay on track
                </p>
              </Card>
            ) : (
              reminders.map((reminder) => (
                <Card key={reminder.id} className="p-6 flex items-center justify-between" data-testid={`card-reminder-${reminder.id}`}>
                  <div className="flex items-center gap-4 flex-1">
                    <Clock className="h-6 w-6" />
                    <div>
                      <p className="text-2xl font-semibold">{reminder.title}</p>
                      <p className="text-lg opacity-75 text-muted-foreground">
                        {reminder.description || reminder.type}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => handleDeleteReminder(reminder.id)}
                    data-testid={`button-delete-reminder-${reminder.id}`}
                  >
                    <Trash2 className="h-6 w-6" />
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
