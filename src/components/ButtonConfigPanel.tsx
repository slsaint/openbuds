// Purpose-built UX for the `buttonConfiguration` category. The device exposes a
// setting per (side × gesture): leftSinglePress, rightSinglePress,
// leftDoublePress, ... Rendered as a flat list this hides the obvious Left/Right
// symmetry, so instead we lay them out as a grid: one row per gesture, a Left
// and a Right column.
//
// Data-driven: we discover gestures from whatever ids match the left*/right*
// pattern, and anything that doesn't match falls through to the generic renderer.
import type { Setting, SettingChange, Value } from "../lib/types";
import { Card, Dropdown } from "./ui";
import { SettingControl, humanize } from "./controls/SettingControl";

type Cat = Record<string, Setting>;

interface Props {
  settings: Cat;
  onChange: (change: SettingChange) => void;
}

const SIDE_RE = /^(left|right)([A-Z].*)$/;

export function ButtonConfigPanel({ settings, onChange }: Props) {
  // gestureKey -> { left?: id, right?: id }, preserving first-seen order.
  const gestures: { key: string; label: string; left?: string; right?: string }[] =
    [];
  const index = new Map<string, number>();

  for (const id of Object.keys(settings)) {
    const m = id.match(SIDE_RE);
    if (!m) continue;
    const side = m[1] as "left" | "right";
    const gestureKey = m[2]; // e.g. "SinglePress"
    if (!index.has(gestureKey)) {
      index.set(gestureKey, gestures.length);
      gestures.push({ key: gestureKey, label: humanize(gestureKey) });
    }
    gestures[index.get(gestureKey)!][side] = id;
  }

  const placed = new Set(gestures.flatMap((g) => [g.left, g.right].filter(Boolean)));
  const leftovers = Object.entries(settings).filter(([id]) => !placed.has(id));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {gestures.length > 0 && (
        <Card title="Tap & Hold Actions">
          {/* column headers */}
          <div className="grid grid-cols-[7rem_1fr_1fr] items-center gap-3 border-b border-[var(--color-border)] pb-2 pt-1 text-xs font-medium text-[var(--color-muted)]">
            <span>Gesture</span>
            <span className="text-center">Left</span>
            <span className="text-center">Right</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {gestures.map((g) => (
              <div
                key={g.key}
                className="grid grid-cols-[7rem_1fr_1fr] items-center gap-3 py-2.5"
              >
                <span className="text-sm">{g.label}</span>
                <ActionCell
                  setting={g.left ? settings[g.left] : undefined}
                  settingId={g.left}
                  onChange={onChange}
                />
                <ActionCell
                  setting={g.right ? settings[g.right] : undefined}
                  settingId={g.right}
                  onChange={onChange}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {leftovers.length > 0 && (
        <Card title="Other">
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

// One grid cell: an action picker for a single side+gesture.
function ActionCell({
  setting,
  settingId,
  onChange,
}: {
  setting: Setting | undefined;
  settingId: string | undefined;
  onChange: (change: SettingChange) => void;
}) {
  if (!setting || !settingId) {
    return <span className="text-center text-xs text-[var(--color-muted)]">—</span>;
  }

  if (setting.type === "select") {
    return (
      <Dropdown
        fullWidth
        options={setting.setting.options}
        labels={setting.setting.localizedOptions}
        value={setting.value}
        onChange={(v) =>
          onChange({ settingId, value: { type: "string", value: v } as Value })
        }
      />
    );
  }

  if (setting.type === "optionalSelect" || setting.type === "modifiableSelect") {
    return (
      <Dropdown
        fullWidth
        options={setting.setting.options}
        labels={setting.setting.localizedOptions}
        value={setting.value ?? ""}
        allowNone
        onChange={(v) =>
          onChange({
            settingId,
            value: { type: "optionalString", value: v === "" ? null : v },
          })
        }
      />
    );
  }

  // Fallback for anything unexpected.
  return (
    <SettingControl settingId={settingId} setting={setting} onChange={onChange} />
  );
}
