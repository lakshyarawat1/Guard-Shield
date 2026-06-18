mod database;
mod packet_capturer;

use crossbeam_channel::{unbounded, Receiver};
use packet_capturer::PacketData;
use std::sync::{Arc, Mutex, RwLock, atomic::{AtomicBool, Ordering}};
use tauri::{AppHandle, Emitter, State, Manager};

struct AppState {
    capture_flag: Mutex<Option<Arc<AtomicBool>>>,
    custom_rules: RwLock<Vec<database::CustomRule>>,
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
fn get_system_health_stats(
    app: AppHandle,
    state: State<'_, AppState>,
    db_state: State<'_, database::DatabaseState>,
) -> Result<database::SystemHealthStats, String> {
    let conn = db_state.conn.lock().unwrap();
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    
    let is_capturing = {
        let flag_lock = state.capture_flag.lock().unwrap();
        if let Some(flag) = &*flag_lock {
            flag.load(Ordering::Relaxed)
        } else {
            false
        }
    };
    
    database::get_system_health_stats(&conn, app_dir, is_capturing).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_database(db_state: State<'_, database::DatabaseState>) -> Result<(), String> {
    let conn = db_state.conn.lock().unwrap();
    database::clear_database(&conn).map_err(|e| e.to_string())
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
fn trigger_mock_alert(
    app: AppHandle,
    db_state: State<'_, database::DatabaseState>,
    severity: String,
    impact: f64,
) -> Result<(), String> {
    if let Ok(conn) = db_state.conn.lock() {
        match database::insert_mock_alert(&conn, &severity, impact) {
            Ok(alert) => {
                let _ = app.emit("intrusion-alert", alert);
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}

#[tauri::command]
fn add_custom_rule(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>, rule: database::CustomRule) -> Result<i64, String> {
    let conn = db_state.conn.lock().unwrap();
    let id = database::insert_custom_rule(&conn, &rule).map_err(|e| e.to_string())?;
    
    if let Ok(rules) = database::get_custom_rules(&conn) {
        if let Ok(mut cache) = state.custom_rules.write() {
            *cache = rules;
        }
    }
    Ok(id)
}

#[tauri::command]
fn fetch_custom_rules(db_state: State<'_, database::DatabaseState>) -> Result<Vec<database::CustomRule>, String> {
    let conn = db_state.conn.lock().unwrap();
    database::get_custom_rules(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_custom_rule(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>, id: i64) -> Result<(), String> {
    let conn = db_state.conn.lock().unwrap();
    database::delete_custom_rule(&conn, id).map_err(|e| e.to_string())?;
    
    if let Ok(rules) = database::get_custom_rules(&conn) {
        if let Ok(mut cache) = state.custom_rules.write() {
            *cache = rules;
        }
    }
    Ok(())
}

#[tauri::command]
fn toggle_custom_rule_state(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>, id: i64, is_active: bool) -> Result<(), String> {
    let conn = db_state.conn.lock().unwrap();
    database::toggle_custom_rule(&conn, id, is_active).map_err(|e| e.to_string())?;
    
    if let Ok(rules) = database::get_custom_rules(&conn) {
        if let Ok(mut cache) = state.custom_rules.write() {
            *cache = rules;
        }
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
        let mut batch = Vec::new();
        let mut last_emit = std::time::Instant::now();

        while let Ok(packet) = rx.recv() {
            let mut packets_to_process = vec![packet];
            
            while let Ok(p) = rx.try_recv() {
                packets_to_process.push(p);
                if packets_to_process.len() >= 200 {
                    break;
                }
            }

            if let Some(db_state) = app_clone.try_state::<database::DatabaseState>() {
                if let Some(app_state) = app_clone.try_state::<AppState>() {
                    if let Ok(conn) = db_state.conn.lock() {
                        let rules = app_state.custom_rules.read().unwrap();
                        for p in &packets_to_process {
                            match database::insert_packet(&conn, p, &mut counter, &rules) {
                                Ok(Some(alert)) => {
                                    let _ = app_clone.emit("intrusion-alert", alert);
                                }
                                Err(e) => eprintln!("DB insert error: {}", e),
                                _ => {}
                            }
                        }
                    }
                }
            }

            batch.extend(packets_to_process);

            if last_emit.elapsed().as_millis() > 500 || batch.len() >= 500 {
                if let Err(e) = app_clone.emit("packets-batch", &batch) {
                    eprintln!("Failed to emit packets batch: {}", e);
                    break;
                }
                batch.clear();
                last_emit = std::time::Instant::now();
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
            let db_state = database::init_db(app_dir).expect("Failed to initialize database");
    
            let custom_rules = database::get_custom_rules(&db_state.conn.lock().unwrap()).unwrap_or_default();

            app.manage(db_state);
            app.manage(AppState {
                capture_flag: Mutex::new(None),
                custom_rules: RwLock::new(custom_rules),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_network_interfaces,
            get_historical_packets,
            get_alerts,
            get_telemetry_stats,
            start_packet_capture,
            stop_packet_capture,
            trigger_mock_alert,
            add_custom_rule,
            fetch_custom_rules,
            remove_custom_rule,
            toggle_custom_rule_state,
            get_system_health_stats,
            clear_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
