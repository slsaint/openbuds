# OpenBuds

A modern, cross-platform (Windows + Linux) desktop client for wireless
earbuds, built on the reverse-engineered protocol core from
[OpenSCQ30](https://github.com/Oppzippy/OpenSCQ30). It controls the earbud
models supported by `openscq30-lib`.

The goal: the solid `openscq30-lib` protocol layer, a better-looking UI.

## Architecture

```
┌──────────────────────────────┐
│  React + TypeScript (Vite)   │   src/        ← the UI you iterate on
│  settings renderer, EQ, etc. │
└──────────────┬───────────────┘
               │ Tauri invoke / events (typed in src/lib/ipc.ts)
┌──────────────┴───────────────┐
│  Tauri (Rust) command layer  │   src-tauri/  ← thin wrappers only
│  session + device state      │
└──────────────┬───────────────┘
               │ depends on
┌──────────────┴───────────────┐
│  openscq30-lib (git dep)     │   protocol, RFCOMM transport, device models
└──────────────────────────────┘
```

**The UI has no per-device code.** The connected device exposes a generic
settings model — `settings_by_category()` returns ordered categories of typed
settings (`toggle`, `select`, `i32Range`, `equalizer`, …), and
`set_setting_values()` applies changes. The React layer just renders whatever
the device reports. Supporting a new earbud model is purely an upstream-lib
concern.

### Why this stack

- The hard part (per-device command encoding, incl. the **Liberty 5 / A3957**)
  is already done and maintained in `openscq30-lib`.
- Tauri lets the Rust core be consumed directly — no FFI — and ships small
  native binaries on Windows and Linux.
- The lib's `Setting`/`Value` enums serialize to tagged camelCase JSON that
  maps 1:1 onto TypeScript discriminated unions (`src/lib/types.ts`).

## Key facts about the Liberty 5 (A3957)

- Transport is **Bluetooth Classic RFCOMM/SPP** (not BLE). Pair the earbuds in
  your OS Bluetooth settings first; this app connects by MAC address.
- Only **one** app can control the device at a time — close the official
  companion mobile app / any other client while using this.
- Supported settings include ambient sound modes (Normal / Transparency /
  Noise Canceling), manual ANC level, transportation + wind-noise modes,
  preset & custom EQ, per-gesture button config, gaming mode, LDAC,
  dual-connection, wearing detection, volume limiting, and per-earbud + case
  battery.

## Prerequisites

- Rust (stable) + Cargo
- Node.js 18+ and npm
- Tauri system deps: https://tauri.app/start/prerequisites/
  - **Linux:** also needs BlueZ with `bluetoothd` running (the lib uses
    `bluer` with the `rfcomm` feature over D-Bus).
  - **Windows:** uses the WinRT Bluetooth APIs — no extra install.

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## License

GPL-3.0 — because `openscq30-lib` is GPL-3.0 and this links against it. Any
distributed build must offer source under the same terms.

## Status / TODO

This is a working scaffold, not a finished app. Wired end-to-end:
device pairing/connect, the generic settings renderer, and the EQ editor.

Not yet done:
- [ ] `multiSelect`, `hueColorPicker` (lights), `timeOfDay` (alarms),
      `importString` control types — add in `src/lib/types.ts` +
      `SettingControl.tsx` as you need them.
- [ ] Pin `openscq30-lib` to a specific commit in `src-tauri/Cargo.toml`
      (it's explicitly an unstable API) instead of tracking `master`.
- [ ] A proper battery / device-header widget (data is already in the
      `general` / `deviceInformation` categories).
- [ ] App icons in `src-tauri/icons/` (run `npm run tauri icon <png>`).
- [ ] Quick presets (the lib exposes a `QuickPresetsHandler`).
- [ ] Verify the `action` setting write convention against the lib's handlers.
```
