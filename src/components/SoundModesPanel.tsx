// Purpose-built UX for the `soundModes` category. Instead of a flat stack of
// dropdowns, it shows the primary ambient-sound mode as a big 3-way selector and
// then reveals ONLY the sub-controls that apply to the active mode.
//
// It stays data-driven: controls are looked up by setting id and silently
// skipped if the device doesn't expose them, and anything in the category we
// don't explicitly place falls through to the generic renderer so nothing is
// lost.
import type { ReactNode } from "react";
import { Volume2, Ear, Waves, Wind } from "lucide-react";
import type { Setting, SettingChange, Value } from "../lib/types";
import { Card, Row, Segmented, Toggle, Slider, ReadOnlyValue } from "./ui";
import { SettingControl } from "./controls/SettingControl";

type Cat = Record<string, Setting>;

interface Props {
  settings: Cat;
  onChange: (change: SettingChange) => void;
}

// Setting ids we lay out explicitly. Everything else in the category falls through.
const PLACED = new Set([
  "ambientSoundMode",
  "transparencyMode",
  "noiseCancelingMode",
  "manualNoiseCanceling",
  "transportationMode",
  "windNoiseSuppression",
  "windNoiseDetected",
]);

// Match an option value by meaning, independent of enum ordering.
const is = (v: string | null | undefined, needle: string) =>
  (v ?? "").toLowerCase().includes(needle);

const AMBIENT_ICONS: Record<string, ReactNode> = {};
function iconFor(optionValue: string): ReactNode {
  if (is(optionValue, "normal")) return <Volume2 className="h-5 w-5" />;
  if (is(optionValue, "transparen")) return <Ear className="h-5 w-5" />;
  if (is(optionValue, "noisecancel")) return <Waves className="h-5 w-5" />;
  return null;
}

export function SoundModesPanel({ settings, onChange }: Props) {
  const emitString = (id: string, value: string) =>
    onChange({ settingId: id, value: { type: "string", value } as Value });

  const ambient = settings["ambientSoundMode"];
  const ambientValue =
    ambient?.type === "select" ? ambient.value : null;

  const showTransparency = is(ambientValue, "transparen");
  const showNoiseCanceling = is(ambientValue, "noisecancel");

  const ncMode = settings["noiseCancelingMode"];
  const ncValue = ncMode?.type === "select" ? ncMode.value : null;

  const leftovers = Object.entries(settings).filter(([id]) => !PLACED.has(id));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Primary mode selector */}
      {ambient?.type === "select" && (
        <Card title="Listening Mode">
          <div className="py-2">
            <Segmented
              size="lg"
              options={ambient.setting.options}
              labels={ambient.setting.localizedOptions}
              value={ambient.value}
              onChange={(v) => emitString("ambientSoundMode", v)}
              icons={Object.fromEntries(
                ambient.setting.options.map((o) => [o, iconFor(o) ?? AMBIENT_ICONS[o]])
              )}
            />
          </div>
        </Card>
      )}

      {/* Contextual sub-controls for Transparency */}
      {showTransparency && settings["transparencyMode"]?.type === "select" && (
        <Card title="Transparency">
          <Row label="Mode">
            <ModeSegment
              setting={settings["transparencyMode"]}
              onChange={(v) => emitString("transparencyMode", v)}
            />
          </Row>
        </Card>
      )}

      {/* Contextual sub-controls for Noise Cancelling */}
      {showNoiseCanceling && (
        <Card title="Noise Cancelling">
          {ncMode?.type === "select" && (
            <Row label="Mode">
              <ModeSegment
                setting={ncMode}
                onChange={(v) => emitString("noiseCancelingMode", v)}
              />
            </Row>
          )}

          {/* Manual strength slider — only meaningful in Manual mode */}
          {is(ncValue, "manual") &&
            settings["manualNoiseCanceling"]?.type === "i32Range" && (
              <Row label="Strength">
                <Slider
                  value={settings["manualNoiseCanceling"].value}
                  min={settings["manualNoiseCanceling"].setting.start}
                  max={settings["manualNoiseCanceling"].setting.end}
                  step={settings["manualNoiseCanceling"].setting.step}
                  onCommit={(v) =>
                    onChange({
                      settingId: "manualNoiseCanceling",
                      value: { type: "i32", value: v },
                    })
                  }
                />
              </Row>
            )}

          {/* Transportation picker — only in Transportation mode */}
          {is(ncValue, "transport") &&
            settings["transportationMode"]?.type === "select" && (
              <Row label="Transport">
                <ModeSegment
                  setting={settings["transportationMode"]}
                  onChange={(v) => emitString("transportationMode", v)}
                />
              </Row>
            )}
        </Card>
      )}

      {/* Wind handling */}
      {(settings["windNoiseSuppression"] || settings["windNoiseDetected"]) && (
        <Card title="Wind">
          {settings["windNoiseSuppression"]?.type === "toggle" && (
            <Row
              label="Wind Noise Suppression"
              hint="Reduce wind noise automatically"
            >
              <span className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-[var(--color-muted)]" />
                <Toggle
                  checked={settings["windNoiseSuppression"].value}
                  onChange={(v) =>
                    onChange({
                      settingId: "windNoiseSuppression",
                      value: { type: "bool", value: v },
                    })
                  }
                />
              </span>
            </Row>
          )}
          {settings["windNoiseDetected"]?.type === "information" && (
            <Row label="Wind Detected">
              <ReadOnlyValue>
                {settings["windNoiseDetected"].translatedValue ||
                  settings["windNoiseDetected"].value}
              </ReadOnlyValue>
            </Row>
          )}
        </Card>
      )}

      {/* Anything we didn't explicitly place */}
      {leftovers.length > 0 && (
        <Card title="More">
          <div className="divide-y divide-[var(--color-border)]">
            {leftovers.map(([id, setting]) => (
              <SettingControl
                key={id}
                settingId={id}
                setting={setting}
                onChange={onChange}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// A select rendered as a segmented control (used for the mode sub-pickers).
function ModeSegment({
  setting,
  onChange,
}: {
  setting: Extract<Setting, { type: "select" }>;
  onChange: (v: string) => void;
}) {
  return (
    <Segmented
      options={setting.setting.options}
      labels={setting.setting.localizedOptions}
      value={setting.value}
      onChange={onChange}
    />
  );
}
