import { useCallback, useEffect, useState } from "react";
import { api, events } from "../lib/ipc";
import {
  CATEGORY_LABELS,
  type SettingChange,
  type SettingsByCategory,
} from "../lib/types";
import { SettingControl } from "./controls/SettingControl";
import { SoundModesPanel } from "./SoundModesPanel";
import { ButtonConfigPanel } from "./ButtonConfigPanel";
import { DeviceHeader } from "./DeviceHeader";
import { Card } from "./ui";

interface Props {
  deviceName: string;
  onDisconnect: () => void;
}

export function SettingsView({ deviceName, onDisconnect }: Props) {
  const [settings, setSettings] = useState<SettingsByCategory>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getSettings();
      if (import.meta.env.DEV) console.debug("settings_by_category:", next);
      setSettings(next);
      setActiveCategory((cur) => cur ?? Object.keys(next)[0] ?? null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    const unlistenSettings = events.onSettingsChanged(refresh);
    const unlistenStatus = events.onConnectionStatus((status) => {
      if (status === "disconnected") onDisconnect();
    });
    return () => {
      unlistenSettings.then((u) => u());
      unlistenStatus.then((u) => u());
    };
  }, [refresh, onDisconnect]);

  const applyChange = async (change: SettingChange) => {
    try {
      await api.setSettings([change]);
      // The device emits settings-changed; refresh() then pulls the truth.
    } catch (e) {
      setError(String(e));
    }
  };

  const categories = Object.keys(settings);
  const current = activeCategory ? settings[activeCategory] : undefined;

  return (
    <div className="flex h-full flex-col">
      <DeviceHeader
        deviceName={deviceName}
        settings={settings}
        onDisconnect={async () => {
          await api.disconnect();
          onDisconnect();
        }}
      />

      {error && (
        <div className="mx-6 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Category sidebar */}
        <nav className="w-48 shrink-0 overflow-y-auto border-r border-[var(--color-border)] p-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={
                "mb-1 w-full rounded-md px-3 py-2 text-left text-sm transition " +
                (cat === activeCategory
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]")
              }
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </nav>

        {/* Settings panel */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {current && activeCategory === "soundModes" ? (
            <SoundModesPanel settings={current} onChange={applyChange} />
          ) : current && activeCategory === "buttonConfiguration" ? (
            <ButtonConfigPanel settings={current} onChange={applyChange} />
          ) : current ? (
            <div className="mx-auto max-w-2xl">
              <Card title={CATEGORY_LABELS[activeCategory!] ?? activeCategory!}>
                <div className="divide-y divide-[var(--color-border)]">
                  {Object.entries(current).map(([settingId, setting]) => (
                    <SettingControl
                      key={settingId}
                      settingId={settingId}
                      setting={setting}
                      onChange={applyChange}
                    />
                  ))}
                </div>
              </Card>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
