// TypeScript mirror of openscq30-lib's public settings model.
// These shapes match the serde (camelCase, tagged) JSON exactly — keep them in
// sync with lib/src/api/settings.rs if you bump the upstream dependency.

export interface ConnectionDescriptor {
  name: string;
  macAddress: string;
}

export interface PairedDeviceInfo {
  macAddress: string;
  model: string; // e.g. "SoundcoreA3957"
  isDemo: boolean;
}

export interface ModelInfo {
  id: string; // "SoundcoreA3957"
  code: string; // "A3957"
}

export type ConnectionStatus = "connected" | "disconnected";

// --- Setting sub-structures -------------------------------------------------

export interface Select {
  options: string[]; // stable ids sent back to the backend
  localizedOptions: string[]; // human-readable labels (same order)
}

export interface Range {
  start: number;
  end: number;
  step: number;
}

export interface Equalizer {
  bandHz: number[]; // center frequency per band, e.g. [100, 200, 400, ...]
  fractionDigits: number; // raw values are scaled: dB = value / 10^fractionDigits
  min: number; // raw min (e.g. -120 => -12.0 dB when fractionDigits = 1)
  max: number; // raw max
}

// --- The tagged Setting union ----------------------------------------------
// Mirrors `enum Setting` with #[serde(tag = "type", rename_all = "camelCase")].

export type Setting =
  | { type: "toggle"; value: boolean }
  | { type: "i32Range"; setting: Range; value: number }
  | { type: "select"; setting: Select; value: string }
  | { type: "optionalSelect"; setting: Select; value: string | null }
  | { type: "modifiableSelect"; setting: Select; value: string | null }
  | { type: "multiSelect"; setting: Select; values: string[] }
  | { type: "multiSelectWithRemove"; setting: Select; values: string[] }
  | { type: "equalizer"; setting: Equalizer; readOnly: boolean; value: number[] }
  | {
      type: "presetEqualizerProfileSelect";
      equalizer: Equalizer;
      select: Select;
      presets: number[][];
      value: string | null;
    }
  | { type: "information"; value: string; translatedValue: string }
  | { type: "importString"; confirmationMessage: string | null }
  | { type: "hueColorPicker"; hue: number }
  | { type: "action" }
  | { type: "timeOfDay"; minutesAfterMidnight: number };

export type SettingType = Setting["type"];

// --- The tagged Value union (sent back on writes) --------------------------
// Mirrors `enum Value` with #[serde(tag = "type", content = "value")].

export type Value =
  | { type: "bool"; value: boolean }
  | { type: "u16"; value: number }
  | { type: "u16Vec"; value: number[] }
  | { type: "optionalU16"; value: number | null }
  | { type: "i16Vec"; value: number[] }
  | { type: "i32"; value: number }
  | { type: "f32"; value: number }
  | { type: "string"; value: string }
  | { type: "stringVec"; value: string[] }
  | { type: "optionalString"; value: string | null };

export interface SettingChange {
  settingId: string;
  value: Value;
}

// Ordered: category id -> (ordered) setting id -> Setting.
export type SettingsByCategory = Record<string, Record<string, Setting>>;

// Human-friendly labels for category ids (serde camelCase variant names).
export const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  soundModes: "Sound Modes",
  equalizer: "Equalizer",
  equalizerImportExport: "EQ Import / Export",
  buttonConfiguration: "Controls",
  deviceInformation: "Device Info",
  miscellaneous: "Miscellaneous",
  limitHighVolume: "Volume Limit",
  dualConnections: "Dual Connection",
  case: "Case",
  lights: "Lights",
  alarms: "Alarms",
};
