//! Tauri command layer. Each command is a thin async wrapper over the
//! `OpenSCQ30Session` / `OpenSCQ30Device` API, returning `Result<_, String>`
//! so errors surface cleanly as rejected promises in the frontend.

use std::str::FromStr;

use macaddr::MacAddr6;
use openscq30_lib::connection::ConnectionDescriptor;
use openscq30_lib::device::OpenSCQ30Device;
use openscq30_lib::settings::{CategoryId, Setting, SettingId, Value};
use openscq30_lib::storage::PairedDevice;
use openscq30_lib::DeviceModel;
use serde::Serialize;
use std::sync::Arc;
use strum::VariantArray;
use tauri::{AppHandle, Emitter, State};

use crate::state::AppState;

/// A selectable device model for the "add device" screen.
#[derive(Serialize)]
pub struct ModelInfo {
    /// Serde variant name, e.g. "SoundcoreA3957". Pass this back verbatim to other commands.
    pub id: String,
    /// Short code shown to the user, e.g. "A3957".
    pub code: String,
}

/// A paired device as the frontend needs it.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairedDeviceInfo {
    pub mac_address: String,
    pub model: String,
    pub is_demo: bool,
}

fn parse_mac(mac: &str) -> Result<MacAddr6, String> {
    MacAddr6::from_str(mac).map_err(|e| format!("invalid mac address '{mac}': {e}"))
}

fn parse_model(model: &str) -> Result<DeviceModel, String> {
    DeviceModel::from_str(model).map_err(|_| format!("unknown device model '{model}'"))
}

/// List every device model the lib supports, for the "add device" picker.
#[tauri::command]
pub fn list_device_models() -> Vec<ModelInfo> {
    DeviceModel::VARIANTS
        .iter()
        .map(|model| {
            let id: &'static str = model.into();
            // Variant name is "Soundcore<CODE>"; strip the prefix for a friendly code.
            let code = id.strip_prefix("Soundcore").unwrap_or(id).to_string();
            ModelInfo {
                id: id.to_string(),
                code,
            }
        })
        .collect()
}

/// List candidate Bluetooth devices for a given model (a superset — e.g. all
/// paired BT devices). The user picks theirs by name/MAC, then calls `pair`.
#[tauri::command]
pub async fn list_devices(
    state: State<'_, AppState>,
    model: String,
) -> Result<Vec<ConnectionDescriptor>, String> {
    let model = parse_model(&model)?;
    state
        .session
        .list_devices(model)
        .await
        .map_err(|e| e.to_string())
}

/// All currently paired (mac <-> model) associations.
#[tauri::command]
pub async fn paired_devices(
    state: State<'_, AppState>,
) -> Result<Vec<PairedDeviceInfo>, String> {
    let devices = state
        .session
        .paired_devices()
        .await
        .map_err(|e| e.to_string())?;
    Ok(devices
        .into_iter()
        .map(|d| PairedDeviceInfo {
            mac_address: d.mac_address.to_string(),
            model: <&'static str>::from(d.model).to_string(),
            is_demo: d.is_demo,
        })
        .collect())
}

/// Associate a MAC address with a device model (so we know how to talk to it).
#[tauri::command]
pub async fn pair(
    state: State<'_, AppState>,
    mac_address: String,
    model: String,
) -> Result<(), String> {
    let mac = parse_mac(&mac_address)?;
    let model = parse_model(&model)?;
    state
        .session
        .pair(PairedDevice {
            mac_address: mac,
            model,
            is_demo: false,
        })
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unpair(state: State<'_, AppState>, mac_address: String) -> Result<(), String> {
    let mac = parse_mac(&mac_address)?;
    state.session.unpair(mac).await.map_err(|e| e.to_string())
}

/// Connect to a paired device. On success the handle is stored in state and two
/// background tasks forward the lib's change notifications to the frontend as
/// `settings-changed` and `connection-status` events.
#[tauri::command]
pub async fn connect(
    app: AppHandle,
    state: State<'_, AppState>,
    mac_address: String,
) -> Result<(), String> {
    let mac = parse_mac(&mac_address)?;
    let device = state.session.connect(mac).await.map_err(|e| e.to_string())?;

    spawn_watchers(app, device.clone());

    *state.device.lock().await = Some(device);
    Ok(())
}

#[tauri::command]
pub async fn disconnect(state: State<'_, AppState>) -> Result<(), String> {
    // Dropping the Arc closes the connection once the lib's internal refs are gone.
    *state.device.lock().await = None;
    Ok(())
}

/// The whole UI payload: ordered categories, each an ordered map of settingId -> Setting.
/// Serializes to e.g. `{ "soundModes": { "ambientSoundMode": { "type": "select", ... } } }`.
#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
) -> Result<indexmap::IndexMap<CategoryId, indexmap::IndexMap<SettingId, Setting>>, String> {
    let guard = state.device.lock().await;
    let device = guard.as_ref().ok_or("not connected to a device")?;
    Ok(device.settings_by_category())
}

/// A single setting change from the UI: the SettingId plus its new Value.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingChange {
    pub setting_id: SettingId,
    pub value: Value,
}

/// Apply one or more setting changes. Batched so the lib can coalesce commands
/// that set multiple fields at once.
#[tauri::command]
pub async fn set_settings(
    state: State<'_, AppState>,
    changes: Vec<SettingChange>,
) -> Result<(), String> {
    let guard = state.device.lock().await;
    let device = guard.as_ref().ok_or("not connected to a device")?;
    let changes = changes
        .into_iter()
        .map(|c| (c.setting_id, c.value))
        .collect();
    device
        .set_setting_values(changes)
        .await
        .map_err(|e| e.to_string())
}

fn spawn_watchers(app: AppHandle, device: Arc<dyn OpenSCQ30Device + Send + Sync>) {
    // Settings changed -> tell the frontend to re-fetch get_settings().
    {
        let app = app.clone();
        let mut rx = device.watch_for_changes();
        tauri::async_runtime::spawn(async move {
            while rx.changed().await.is_ok() {
                let _ = app.emit("settings-changed", ());
            }
        });
    }
    // Connection status -> notify the frontend on disconnect.
    {
        let mut rx = device.connection_status();
        tauri::async_runtime::spawn(async move {
            while rx.changed().await.is_ok() {
                let status = *rx.borrow();
                let _ = app.emit("connection-status", status);
            }
        });
    }
}
