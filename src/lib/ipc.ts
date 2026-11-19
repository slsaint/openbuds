// Typed wrappers around the Tauri command layer. Nothing else in the UI should
// call `invoke` directly — keep the backend surface in one place.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ConnectionDescriptor,
  ConnectionStatus,
  ModelInfo,
  PairedDeviceInfo,
  SettingChange,
  SettingsByCategory,
} from "./types";

export const api = {
  listDeviceModels: () => invoke<ModelInfo[]>("list_device_models"),

  listDevices: (model: string) =>
    invoke<ConnectionDescriptor[]>("list_devices", { model }),

  pairedDevices: () => invoke<PairedDeviceInfo[]>("paired_devices"),

  pair: (macAddress: string, model: string) =>
    invoke<void>("pair", { macAddress, model }),

  unpair: (macAddress: string) => invoke<void>("unpair", { macAddress }),

  connect: (macAddress: string) => invoke<void>("connect", { macAddress }),

  disconnect: () => invoke<void>("disconnect"),

  getSettings: () => invoke<SettingsByCategory>("get_settings"),

  setSettings: (changes: SettingChange[]) =>
    invoke<void>("set_settings", { changes }),
};

// Backend -> frontend events.
export const events = {
  onSettingsChanged: (cb: () => void): Promise<UnlistenFn> =>
    listen("settings-changed", () => cb()),

  onConnectionStatus: (
    cb: (status: ConnectionStatus) => void
  ): Promise<UnlistenFn> =>
    listen<ConnectionStatus>("connection-status", (e) => cb(e.payload)),
};
