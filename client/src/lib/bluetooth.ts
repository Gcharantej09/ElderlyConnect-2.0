export type BleSample = {
  heartRate?: number;
  bloodOxygen?: number;
  steps?: number;
  batteryLevel?: number;
  recordedAt: string;
};

export type BleDeviceInfo = {
  id: string;
  name: string;
  manufacturer?: string;
  services: string[];
  source: "web-bluetooth" | "simulator";
};

const HEART_RATE_SERVICE = 0x180d;
const HEART_RATE_MEASUREMENT = 0x2a37;
const PULSE_OXIMETER_SERVICE = 0x1822;
const PULSE_OX_MEASUREMENT = 0x2a5e;
const BATTERY_SERVICE = 0x180f;
const BATTERY_LEVEL = 0x2a19;
const RUNNING_SPEED_CADENCE_SERVICE = 0x1814;
const RSC_MEASUREMENT = 0x2a53;

const KNOWN_SERVICES = [
  HEART_RATE_SERVICE,
  PULSE_OXIMETER_SERVICE,
  BATTERY_SERVICE,
  RUNNING_SPEED_CADENCE_SERVICE,
];

function serviceName(uuid: number): string {
  switch (uuid) {
    case HEART_RATE_SERVICE:
      return "heart_rate";
    case PULSE_OXIMETER_SERVICE:
      return "pulse_oximeter";
    case BATTERY_SERVICE:
      return "battery";
    case RUNNING_SPEED_CADENCE_SERVICE:
      return "running_speed_cadence";
    default:
      return `0x${uuid.toString(16).padStart(4, "0")}`;
  }
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  const loc = window.location;
  if (loc.protocol === "https:") return true;
  if (loc.protocol === "http:" && (loc.hostname === "localhost" || loc.hostname === "127.0.0.1")) {
    return true;
  }
  return false;
}

function parseHeartRate(value: DataView): number | undefined {
  if (value.byteLength < 2) return undefined;
  const flags = value.getUint8(0);
  const is16bit = (flags & 0x01) !== 0;
  return is16bit ? value.getUint16(1, true) : value.getUint8(1);
}

function parseSpO2(value: DataView): { spo2: number; pulse?: number } | undefined {
  if (value.byteLength < 4) return undefined;
  const flags = value.getUint8(0);
  let offset = 1;
  if ((flags & 0x01) !== 0) offset += 4;
  if ((flags & 0x02) !== 0) offset += 2;
  if ((flags & 0x04) !== 0) offset += 2;
  if ((flags & 0x08) !== 0) offset += 2;
  if (value.byteLength < offset + 2) return undefined;
  const spo2 = value.getUint16(offset, true) * 0.01;
  let pulse: number | undefined;
  if ((flags & 0x10) !== 0 && value.byteLength >= offset + 4) {
    pulse = value.getUint16(offset + 2, true);
  }
  return { spo2, pulse };
}

type AnyCharacteristic = {
  startNotifications: () => Promise<any>;
  stopNotifications: () => Promise<any>;
  addEventListener: (event: string, listener: (ev: Event) => void) => void;
  removeEventListener: (event: string, listener: (ev: Event) => void) => void;
  readValue: () => Promise<DataView>;
  uuid: string | number;
  service: { uuid: string | number };
};

type AnyService = {
  getCharacteristic: (uuid: string | number) => Promise<AnyCharacteristic>;
  uuid: string | number;
};

type AnyServer = {
  connect: () => Promise<any>;
  disconnect: () => void;
  getPrimaryService: (uuid: string | number) => Promise<AnyService>;
};

type AnyDevice = {
  id: string;
  name?: string;
  gatt?: AnyServer;
  addEventListener: (event: string, listener: (ev: Event) => void) => void;
  removeEventListener: (event: string, listener: (ev: Event) => void) => void;
};

export type LiveDeviceHandle = {
  info: BleDeviceInfo;
  disconnect: () => Promise<void>;
};

export type ScanOptions = {
  acceptAll?: boolean;
};

export async function scanAndConnect(
  onSample: (sample: BleSample) => void,
  options: ScanOptions = {},
): Promise<LiveDeviceHandle> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth is not available in this browser. Use Chrome or Edge on desktop or Android.");
  }
  if (!isSecureContext()) {
    throw new Error("Bluetooth requires HTTPS or localhost. Open the app over a secure origin.");
  }
  const bt = (navigator as any).bluetooth;
  const filters = options.acceptAll
    ? undefined
    : [{ services: KNOWN_SERVICES.map((u) => u.toString(16).padStart(4, "0")) }];
  const device: AnyDevice = await bt.requestDevice({
    filters,
    optionalServices: KNOWN_SERVICES,
  });

  device.addEventListener("gattserverdisconnected", () => {
    /* surfaced via disconnect() */
  });

  if (!device.gatt) {
    throw new Error("Selected device has no GATT server");
  }
  const server = await device.gatt.connect();
  const services: AnyService[] = [];
  const characteristicHandlers: Array<{ characteristic: AnyCharacteristic; listener: (ev: Event) => void }> = [];
  const servicesFound: string[] = [];

  for (const serviceUuid of KNOWN_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      services.push(service);
      servicesFound.push(serviceName(serviceUuid));

      if (serviceUuid === HEART_RATE_SERVICE) {
        const ch = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
        const listener = (ev: Event) => {
          const target = ev.target as unknown as { value?: DataView };
          const value = target.value;
          if (!value) return;
          const hr = parseHeartRate(value);
          if (typeof hr === "number") onSample({ heartRate: hr, recordedAt: new Date().toISOString() });
        };
        ch.addEventListener("characteristicvaluechanged", listener);
        characteristicHandlers.push({ characteristic: ch, listener });
        await ch.startNotifications();
      } else if (serviceUuid === PULSE_OXIMETER_SERVICE) {
        const ch = await service.getCharacteristic(PULSE_OX_MEASUREMENT);
        const listener = (ev: Event) => {
          const target = ev.target as unknown as { value?: DataView };
          const value = target.value;
          if (!value) return;
          const parsed = parseSpO2(value);
          if (parsed) {
            const sample: BleSample = { bloodOxygen: Math.round(parsed.spo2), recordedAt: new Date().toISOString() };
            if (parsed.pulse) sample.heartRate = parsed.pulse;
            onSample(sample);
          }
        };
        ch.addEventListener("characteristicvaluechanged", listener);
        characteristicHandlers.push({ characteristic: ch, listener });
        await ch.startNotifications();
      } else if (serviceUuid === BATTERY_SERVICE) {
        try {
          const ch = await service.getCharacteristic(BATTERY_LEVEL);
          const value = await ch.readValue();
          if (value.byteLength >= 1) onSample({ batteryLevel: value.getUint8(0), recordedAt: new Date().toISOString() });
        } catch {
          /* many devices gate battery behind a different flow */
        }
      } else if (serviceUuid === RUNNING_SPEED_CADENCE_SERVICE) {
        try {
          const ch = await service.getCharacteristic(RSC_MEASUREMENT);
          const value = await ch.readValue();
          if (value.byteLength >= 4) {
            const speed = value.getUint16(2, true) * 0.01;
            const stepRate = value.getUint8(5);
            onSample({ steps: Math.round(speed * 60 + stepRate * 2), recordedAt: new Date().toISOString() });
          }
        } catch {
          /* not all devices expose RSC read */
        }
      }
    } catch {
      /* service not present, skip */
    }
  }

  if (services.length === 0) {
    try { server.disconnect(); } catch { /* ignore */ }
    throw new Error("No supported health services were found on this device.");
  }

  const handle: LiveDeviceHandle = {
    info: {
      id: device.id,
      name: device.name || "BLE device",
      services: servicesFound,
      source: "web-bluetooth",
    },
    disconnect: async () => {
      for (const { characteristic, listener } of characteristicHandlers) {
        try { await characteristic.stopNotifications(); } catch { /* ignore */ }
        try { characteristic.removeEventListener("characteristicvaluechanged", listener); } catch { /* ignore */ }
      }
      try { server.disconnect(); } catch { /* ignore */ }
    },
  };
  return handle;
}

export type SimulatorHandle = LiveDeviceHandle & {
  setSimulatedHealth: (patch: Partial<BleSample>) => void;
};

export function startSimulator(onSample: (sample: BleSample) => void): SimulatorHandle {
  let steps = 5200 + Math.floor(Math.random() * 400);
  let heartRate = 72;
  let bloodOxygen = 98;
  let batteryLevel = 86;
  const emit = () =>
    onSample({
      heartRate,
      steps,
      bloodOxygen,
      batteryLevel,
      recordedAt: new Date().toISOString(),
    });
  emit();
  const interval = setInterval(() => {
    heartRate = 60 + Math.floor(Math.random() * 30);
    bloodOxygen = 96 + Math.floor(Math.random() * 4);
    steps += Math.floor(Math.random() * 40);
    if (steps > 12000) steps = 5000;
    if (Math.random() < 0.05 && batteryLevel > 0) batteryLevel -= 1;
    emit();
  }, 5000);
  return {
    info: {
      id: "simulator",
      name: "Simulated Health Band",
      services: ["heart_rate", "pulse_oximeter", "battery"],
      source: "simulator",
    },
    disconnect: async () => clearInterval(interval),
    setSimulatedHealth: (patch) => {
      if (typeof patch.heartRate === "number") heartRate = patch.heartRate;
      if (typeof patch.bloodOxygen === "number") bloodOxygen = patch.bloodOxygen;
      if (typeof patch.steps === "number") steps = patch.steps;
      if (typeof patch.batteryLevel === "number") batteryLevel = patch.batteryLevel;
      emit();
    },
  };
}

export async function persistDevice(info: BleDeviceInfo): Promise<{ id: string }> {
  const res = await fetch("/api/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      deviceId: info.id,
      name: info.name,
      kind: info.source === "simulator" ? "simulator" : "ble-generic",
      services: info.services,
      metadata: { manufacturer: info.manufacturer ?? null },
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to save paired device");
  }
  return (await res.json()) as { id: string };
}

export async function syncHealthSample(sample: BleSample, deviceId?: string): Promise<void> {
  await fetch("/api/health/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...sample, deviceId }),
  });
}

export async function loadPairedDevices(): Promise<{ id: string; name: string; deviceId: string; lastSeenAt: string; services: string[] | null }[]> {
  const res = await fetch("/api/devices", { credentials: "include" });
  if (!res.ok) return [];
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

export async function unpairDevice(id: string): Promise<void> {
  await fetch(`/api/devices/${id}`, { method: "DELETE", credentials: "include" });
}
