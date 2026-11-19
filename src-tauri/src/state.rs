use std::{path::PathBuf, sync::Arc};

use openscq30_lib::device::OpenSCQ30Device;
use openscq30_lib::OpenSCQ30Session;
use tokio::sync::Mutex;

/// Managed application state, shared across all Tauri commands.
pub struct AppState {
    /// The sqlite-backed session: knows about paired (mac <-> model) devices and
    /// hands out connected `OpenSCQ30Device` handles.
    pub session: OpenSCQ30Session,
    /// The currently connected device, if any. A new connection replaces it.
    pub device: Mutex<Option<Arc<dyn OpenSCQ30Device + Send + Sync>>>,
}

impl AppState {
    pub async fn new(db_path: PathBuf) -> Result<Self, String> {
        let session = OpenSCQ30Session::new(db_path)
            .await
            .map_err(|e| format!("failed to open session: {e}"))?;
        Ok(Self {
            session,
            device: Mutex::new(None),
        })
    }
}
