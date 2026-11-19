import { useState } from "react";
import { DeviceSelection } from "./components/DeviceSelection";
import { SettingsView } from "./components/SettingsView";

export default function App() {
  const [connectedName, setConnectedName] = useState<string | null>(null);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      {connectedName ? (
        <SettingsView
          deviceName={connectedName}
          onDisconnect={() => setConnectedName(null)}
        />
      ) : (
        <DeviceSelection onConnected={setConnectedName} />
      )}
    </div>
  );
}
