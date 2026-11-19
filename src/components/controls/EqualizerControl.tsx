import { useEffect, useState } from "react";
import type { Setting } from "../../lib/types";

type EqSetting = Extract<Setting, { type: "equalizer" }>;

interface Props {
  setting: EqSetting;
  onChange: (rawBands: number[]) => void;
}

const PLOT_H = 150; // px height of the fader area

// Per-band vertical faders with a 0 dB reference line. Raw integer values are
// scaled by fractionDigits into dB for display. Changes commit on release.
export function EqualizerControl({ setting, onChange }: Props) {
  const { bandHz, fractionDigits, min, max } = setting.setting;
  const [bands, setBands] = useState<number[]>(setting.value);

  useEffect(() => setBands(setting.value), [setting.value]);

  const scale = Math.pow(10, fractionDigits);
  const toDb = (raw: number) => raw / scale;
  const fmtDb = (raw: number) => {
    const v = toDb(raw);
    const s = v.toFixed(fractionDigits);
    return v > 0 ? `+${s}` : s;
  };
  const fmtHz = (hz: number) =>
    hz >= 1000 ? `${(hz / 1000).toFixed(hz % 1000 ? 1 : 0)}k` : `${hz}`;

  // Vertical position of the 0 dB line within the plot (0 = top).
  const zeroPct = ((max - 0) / (max - min)) * 100;

  const setBand = (i: number, raw: number) => {
    const next = bands.slice();
    next[i] = raw;
    setBands(next);
  };

  const cols = { gridTemplateColumns: `repeat(${bands.length}, minmax(0, 1fr))` };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/30 p-4">
      {/* dB values */}
      <div className="grid gap-1" style={cols}>
        {bands.map((raw, i) => (
          <span
            key={i}
            className={
              "text-center text-[11px] tabular-nums " +
              (toDb(raw) > 0
                ? "text-[var(--color-accent)]"
                : toDb(raw) < 0
                ? "text-amber-400/90"
                : "text-[var(--color-muted)]")
            }
          >
            {fmtDb(raw)}
          </span>
        ))}
      </div>

      {/* fader plot with 0 dB reference line */}
      <div className="relative my-1" style={{ height: PLOT_H }}>
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--color-border)]"
          style={{ top: `${zeroPct}%` }}
        >
          <span className="absolute right-0 -top-4 text-[10px] text-[var(--color-muted)]">
            0 dB
          </span>
        </div>
        <div className="grid h-full" style={cols}>
          {bands.map((raw, i) => (
            <div key={i} className="flex items-center justify-center">
              <input
                type="range"
                className="eq-fader cursor-pointer accent-[var(--color-accent)]"
                style={
                  {
                    writingMode: "vertical-lr",
                    direction: "rtl",
                    height: PLOT_H - 8,
                    width: 20,
                  } as React.CSSProperties
                }
                min={min}
                max={max}
                step={1}
                value={raw}
                onChange={(e) => setBand(i, Number(e.target.value))}
                onMouseUp={() => onChange(bands)}
                onTouchEnd={() => onChange(bands)}
                disabled={setting.readOnly}
              />
            </div>
          ))}
        </div>
      </div>

      {/* frequency labels */}
      <div className="grid gap-1" style={cols}>
        {bands.map((_, i) => (
          <span
            key={i}
            className="text-center text-[11px] tabular-nums text-[var(--color-muted)]"
          >
            {fmtHz(bandHz[i] ?? 0)}
          </span>
        ))}
      </div>

      {!setting.readOnly && (
        <div className="mt-3 flex justify-end border-t border-[var(--color-border)] pt-2">
          <button
            className="rounded-md px-2.5 py-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
            onClick={() => {
              const flat = bands.map(() => 0);
              setBands(flat);
              onChange(flat);
            }}
          >
            Reset to flat
          </button>
        </div>
      )}
    </div>
  );
}
