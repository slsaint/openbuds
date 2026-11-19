// Header strip: device name, connection state, and battery for each component
// (left bud / right bud / case). Battery is reported by the lib as an
// `information` setting whose value looks like "5/5" — we parse that into a
// fraction and draw a small bar.
import { BatteryCharging } from "lucide-react";
import type { SettingsByCategory, Setting } from "../lib/types";

interface Props {
  deviceName: string;
  settings: SettingsByCategory;
  onDisconnect: () => void;
}

function findSetting(settings: SettingsByCategory, id: string): Setting | undefined {
  for (const category of Object.values(settings)) {
    if (category[id]) return category[id];
  }
  return undefined;
}

function infoValue(s: Setting | undefined): string | null {
  if (!s) return null;
  if (s.type === "information") return s.translatedValue || s.value;
  return null;
}

// "5/5" -> 1.0, "3/5" -> 0.6, bare "4" -> 4/5. Returns null if unparseable.
function parseFraction(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) {
    const [, a, b] = m;
    const denom = Number(b) || 1;
    return Math.max(0, Math.min(1, Number(a) / denom));
  }
  const n = Number(raw.trim());
  if (!Number.isNaN(n)) return Math.max(0, Math.min(1, n / 5));
  return null;
}

function isCharging(settings: SettingsByCategory, id: string): boolean {
  const s = findSetting(settings, id);
  if (!s) return false;
  if (s.type === "toggle") return s.value;
  if (s.type === "information")
    return /yes|true|charging/i.test(s.translatedValue || s.value);
  return false;
}

function Battery({
  label,
  fraction,
  charging,
}: {
  label: string;
  fraction: number;
  charging: boolean;
}) {
  const pct = Math.round(fraction * 100);
  const color =
    fraction > 0.5 ? "#4ade80" : fraction > 0.2 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <div className="relative h-4 w-10 rounded-sm border border-[var(--color-border)] p-0.5">
        <div
          className="h-full rounded-[1px]"
          style={{ width: `${pct}%`, background: color }}
        />
        {charging && (
          <BatteryCharging className="absolute inset-0 m-auto h-3 w-3 text-white/80" />
        )}
      </div>
      <span className="w-8 text-xs tabular-nums text-[var(--color-text)]">
        {pct}%
      </span>
    </div>
  );
}

interface Batt {
  label: string;
  levelId: string;
  fraction: number;
  charging: boolean;
}

export function DeviceHeader({ deviceName, settings, onDisconnect }: Props) {
  const sources = [
    { label: "L", levelId: "batteryLevelLeft", chargingId: "isChargingLeft" },
    { label: "R", levelId: "batteryLevelRight", chargingId: "isChargingRight" },
    { label: "Case", levelId: "caseBatteryLevel", chargingId: "isChargingCase" },
    { label: "Battery", levelId: "batteryLevel", chargingId: "isCharging" },
  ];

  const batteries: Batt[] = [];
  for (const s of sources) {
    const fraction = parseFraction(infoValue(findSetting(settings, s.levelId)));
    if (fraction === null) continue;
    batteries.push({
      label: s.label,
      levelId: s.levelId,
      fraction,
      charging: isCharging(settings, s.chargingId),
    });
  }

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)]">
          <span className="text-sm font-bold text-[var(--color-accent)]">
            {deviceName.replace(/^Soundcore/, "").slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-base font-semibold">
            {deviceName.replace(/^Soundcore\s*/i, "") || deviceName}
          </h1>
          <p className="text-xs text-emerald-400">● Connected</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {batteries.length > 0 && (
          <div className="flex items-center gap-4">
            {batteries.map((b) => (
              <Battery
                key={b.levelId}
                label={b.label}
                fraction={b.fraction}
                charging={b.charging}
              />
            ))}
          </div>
        )}
        <button
          onClick={onDisconnect}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-2)]"
        >
          Disconnect
        </button>
      </div>
    </header>
  );
}
