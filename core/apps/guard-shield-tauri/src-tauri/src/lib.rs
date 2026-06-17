mod database;
mod packet_capturer;

use crossbeam_channel::{unbounded, Receiver};
use packet_capturer::PacketData;
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use tauri::{AppHandle, Emitter, State, Manager};

struct AppState {
    capture_flag: Mutex<Option<Arc<AtomicBool>>>,
}

#[tauri::command]
fn get_network_interfaces() -> Vec<String> {
    packet_capturer::get_interfaces()
}

#[tauri::command]
fn get_historical_packets(state: State<'_, database::DatabaseState>) -> Result<Vec<PacketData>, String> {
    let conn = state.conn.lock().unwrap();
    database::get_packets(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_alerts(state: State<'_, database::DatabaseState>) -> Result<Vec<database::AlertData>, String> {
    let conn = state.conn.lock().unwrap();
    database::get_alerts(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_telemetry_stats(state: State<'_, database::DatabaseState>) -> Result<database::TelemetryStats, String> {
    let conn = state.conn.lock().unwrap();
    database::get_telemetry_stats(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_packet_capture(state: State<'_, AppState>) -> Result<(), String> {
    let mut flag_lock = state.capture_flag.lock().unwrap();
    if let Some(old_flag) = flag_lock.take() {
        old_flag.store(false, Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
fn start_packet_capture(
    app: AppHandle,
    state: State<'_, AppState>,
    interface_name: String,
    bpf_filter: String,
) -> Result<(), String> {
    let mut flag_lock = state.capture_flag.lock().unwrap();
    if let Some(old_flag) = flag_lock.take() {
        old_flag.store(false, Ordering::Relaxed);
    }

    let new_flag = Arc::new(AtomicBool::new(true));
    *flag_lock = Some(new_flag.clone());

    let (tx, rx): (
        crossbeam_channel::Sender<PacketData>,
        Receiver<PacketData>,
    ) = unbounded();

    if let Err(e) = packet_capturer::start_capture(interface_name, bpf_filter, tx, new_flag) {
        *flag_lock = None;
        return Err(e);
    }

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut counter = 0u64;
        while let Ok(packet) = rx.recv() {
            if let Some(db_state) = app_clone.try_state::<database::DatabaseState>() {
                if let Ok(conn) = db_state.conn.lock() {
                    match database::insert_packet(&conn, &packet, &mut counter) {
                        Ok(Some(alert)) => {
                            let _ = app_clone.emit("intrusion-alert", alert);
                        }
                        Err(e) => eprintln!("DB insert error: {}", e),
                        _ => {}
                    }
                }
            }

            if let Err(e) = app_clone.emit("packet-captured", packet) {
                eprintln!("Failed to emit packet: {}", e);
                break;
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_state = database::init_db(app_dir).expect("Failed to init database");
            app.manage(db_state);
            Ok(())
        })
        .manage(AppState {
            capture_flag: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_network_interfaces,
            start_packet_capture,
            stop_packet_capture,
            get_historical_packets,
            get_alerts,
            get_telemetry_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
