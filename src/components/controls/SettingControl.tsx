import type { Setting, SettingChange, Value } from "../../lib/types";
import { EqualizerControl } from "./EqualizerControl";
import { Row, Toggle, Segmented, Dropdown, Slider, ReadOnlyValue } from "../ui";

interface Props {
  settingId: string;
  setting: Setting;
  onChange: (change: SettingChange) => void;
}

// Turn a camelCase settingId into a readable label as a fallback.
// ("ambientSoundMode" -> "Ambient Sound Mode")
export function humanize(id: string): string {
  return id
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
    // Fix up acronyms that the camelCase split mangles.
    .replace(/\bLdac\b/g, "LDAC")
    .replace(/\bEq\b/g, "EQ")
    .replace(/\bAnc\b/g, "ANC");
}

// Few options read best as a segmented control; many belong in a dropdown.
const SEGMENT_MAX = 4;

export function SettingControl({ settingId, setting, onChange }: Props) {
  const emit = (value: Value) => onChange({ settingId, value });
  const label = humanize(settingId);

  switch (setting.type) {
    case "toggle":
      return (
        <Row label={label}>
          <Toggle
            checked={setting.value}
            onChange={(v) => emit({ type: "bool", value: v })}
          />
        </Row>
      );

    case "i32Range":
      return (
        <Row label={label}>
          <Slider
            value={setting.value}
            min={setting.setting.start}
            max={setting.setting.end}
            step={setting.setting.step}
            onCommit={(v) => emit({ type: "i32", value: v })}
          />
        </Row>
      );

    case "select": {
      const { options, localizedOptions } = setting.setting;
      const onSelect = (v: string) => emit({ type: "string", value: v });
      return (
        <Row label={label}>
          {options.length <= SEGMENT_MAX ? (
            <Segmented
              options={options}
              labels={localizedOptions}
              value={setting.value}
              onChange={onSelect}
            />
          ) : (
            <Dropdown
              options={options}
              labels={localizedOptions}
              value={setting.value}
              onChange={onSelect}
            />
          )}
        </Row>
      );
    }

    case "optionalSelect":
    case "modifiableSelect":
      return (
        <Row label={label}>
          <Dropdown
            options={setting.setting.options}
            labels={setting.setting.localizedOptions}
            value={setting.value ?? ""}
            allowNone
            onChange={(v) =>
              emit({ type: "optionalString", value: v === "" ? null : v })
            }
          />
        </Row>
      );

    case "equalizer":
      return (
        <div className="py-2">
          <p className="mb-2 text-sm">{label}</p>
          <EqualizerControl
            setting={setting}
            onChange={(bands) => emit({ type: "i16Vec", value: bands })}
          />
        </div>
      );

    case "presetEqualizerProfileSelect":
      return (
        <Row label={label}>
          <Dropdown
            options={setting.select.options}
            labels={setting.select.localizedOptions}
            value={setting.value ?? ""}
            allowNone
            onChange={(v) =>
              emit({ type: "optionalString", value: v === "" ? null : v })
            }
          />
        </Row>
      );

    case "multiSelect":
    case "multiSelectWithRemove":
      return (
        <div className="py-3">
          <span className="mb-2 block text-sm text-[var(--color-text)]">
            {label}
          </span>
          <div className="flex flex-wrap gap-2">
            {setting.setting.options.map((opt, i) => {
              const active = setting.values.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    const next = active
                      ? setting.values.filter((v) => v !== opt)
                      : [...setting.values, opt];
                    emit({ type: "stringVec", value: next });
                  }}
                  className={
                    "rounded-full border px-3 py-1 text-xs transition " +
                    (active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]")
                  }
                >
                  {setting.setting.localizedOptions[i] ?? opt}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "information":
      return (
        <Row label={label}>
          <ReadOnlyValue>
            {setting.translatedValue || setting.value}
          </ReadOnlyValue>
        </Row>
      );

    case "action":
      return (
        <Row label={label}>
          <button
            className="rounded-md bg-[var(--color-surface-2)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-accent-soft)] active:scale-[0.98] transition"
            onClick={() => emit({ type: "bool", value: true })}
          >
            Run
          </button>
        </Row>
      );

    default:
      // Not-yet-implemented types (hueColorPicker, timeOfDay, importString).
      return (
        <Row label={label}>
          <span className="text-xs text-amber-400/80">
            unsupported: {setting.type}
          </span>
        </Row>
      );
  }
}
