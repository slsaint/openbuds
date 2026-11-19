import { useEffect, useState } from "react";
import { Bluetooth, Plus, Trash2, RefreshCw } from "lucide-react";
import { api } from "../lib/ipc";
import type {
  ConnectionDescriptor,
  ModelInfo,
  PairedDeviceInfo,
} from "../lib/types";

interface Props {
  onConnected: (name: string) => void;
}

export function DeviceSelection({ onConnected }: Props) {
  const [paired, setPaired] = useState<PairedDeviceInfo[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPaired = () =>
    api.pairedDevices().then(setPaired).catch((e) => setError(String(e)));

  useEffect(() => {
    loadPaired();
  }, []);

  const connect = async (mac: string, name: string) => {
    setBusy(mac);
    setError(null);
    try {
      await api.connect(mac);
      onConnected(name);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5 text-[var(--color-accent)]" />
          <h1 className="text-lg font-semibold">Your Devices</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {paired.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center text-[var(--color-muted)]">
          No devices yet. Pair your earbuds in your OS Bluetooth settings first,
          then click <span className="text-[var(--color-text)]">Add</span>.
        </div>
      ) : (
        <ul className="space-y-2">
          {paired.map((d) => (
            <li
              key={d.macAddress}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {d.model.replace(/^Soundcore\s*/i, "") || d.model}
                </p>
                <p className="text-xs tabular-nums text-[var(--color-muted)]">
                  {d.macAddress}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={busy === d.macAddress}
                  onClick={() => connect(d.macAddress, d.model)}
                  className="rounded-md bg-[var(--color-surface-2)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
                >
                  {busy === d.macAddress ? "Connecting…" : "Connect"}
                </button>
                <button
                  onClick={async () => {
                    await api.unpair(d.macAddress);
                    loadPaired();
                  }}
                  className="rounded-md p-1.5 text-[var(--color-muted)] hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddDeviceDialog
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            loadPaired();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

// Pick a model, scan for a matching Bluetooth device, and pair (mac <-> model).
function AddDeviceDialog({
  onClose,
  onAdded,
  onError,
}: {
  onClose: () => void;
  onAdded: () => void;
  onError: (e: string) => void;
}) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState<string>("");
  const [candidates, setCandidates] = useState<ConnectionDescriptor[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    api.listDeviceModels().then((m) => {
      setModels(m);
      // Default to the Liberty 5 if present — handy during development.
      const liberty5 = m.find((x) => x.code === "A3957");
      setModel(liberty5?.id ?? m[0]?.id ?? "");
    });
  }, []);

  const scan = async (modelId: string) => {
    if (!modelId) return;
    setScanning(true);
    try {
      setCandidates(await api.listDevices(modelId));
    } catch (e) {
      onError(String(e));
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (model) scan(model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold">Add a device</h2>

        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          Model
        </label>
        <input
          list="models"
          value={models.find((m) => m.id === model)?.code ?? ""}
          onChange={(e) => {
            const picked = models.find((m) => m.code === e.target.value);
            if (picked) setModel(picked.id);
          }}
          placeholder="Search model, e.g. A3957"
          className="mb-4 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <datalist id="models">
          {models.map((m) => (
            <option key={m.id} value={m.code} />
          ))}
        </datalist>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted)]">
            Paired Bluetooth devices
          </span>
          <button
            onClick={() => scan(model)}
            className="flex items-center gap-1 text-xs text-[var(--color-accent)]"
          >
            <RefreshCw className={"h-3 w-3 " + (scanning ? "animate-spin" : "")} />
            Rescan
          </button>
        </div>

        <ul className="mb-4 max-h-48 space-y-1 overflow-y-auto">
          {candidates.length === 0 && (
            <li className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted)]">
              {scanning ? "Scanning…" : "Nothing found. Make sure the earbuds are paired in your OS and any companion app is closed."}
            </li>
          )}
          {candidates.map((c) => (
            <li
              key={c.macAddress}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2"
            >
              <div>
                <p className="text-sm">{c.name}</p>
                <p className="text-xs tabular-nums text-[var(--color-muted)]">
                  {c.macAddress}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await api.pair(c.macAddress, model);
                    onAdded();
                  } catch (e) {
                    onError(String(e));
                  }
                }}
                className="rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white hover:brightness-110"
              >
                Pair
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
