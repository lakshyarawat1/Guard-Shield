mod database;
mod packet_capturer;
mod ips_engine;
pub mod threat_feed;

use crossbeam_channel::{unbounded, Receiver};
use packet_capturer::PacketData;
use std::sync::{Arc, Mutex, RwLock, atomic::{AtomicBool, Ordering}};
use tauri::{AppHandle, Emitter, State, Manager};
use ips_engine::IpsEngine;
use std::collections::HashSet;

struct AppState {
    capture_flag: Mutex<Option<Arc<AtomicBool>>>,
    custom_rules: RwLock<Vec<database::CustomRule>>,
    geoip_reader: Arc<RwLock<Option<maxminddb::Reader<Vec<u8>>>>>,
    ips_engine: Arc<Mutex<IpsEngine>>,
    blocked_ips: Arc<RwLock<Vec<String>>>,
    whitelisted_ips: Arc<RwLock<Vec<String>>>,
    auto_block_enabled: Arc<AtomicBool>,
    malware_engine_enabled: Arc<AtomicBool>,
    malware_active_mode: Arc<AtomicBool>,
    malware_signatures_enabled: Arc<AtomicBool>,
    malware_heuristics_enabled: Arc<AtomicBool>,
    malware_autoban_enabled: Arc<AtomicBool>,
    threat_ips: Arc<RwLock<HashSet<String>>>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct MalwareProtections {
    signatures: bool,
    heuristics: bool,
    #[serde(rename = "autoBan")]
    auto_ban: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct MalwareSettings {
    #[serde(rename = "engineEnabled")]
    engine_enabled: bool,
    #[serde(rename = "activeMode")]
    active_mode: bool,
    protections: MalwareProtections,
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

trait DnsResolver {
    fn lookup_addr(&self, ip: &std::net::IpAddr) -> std::io::Result<String>;
    fn lookup_host(&self, host: &str) -> std::io::Result<Vec<std::net::IpAddr>>;
}

struct RealDnsResolver;

impl DnsResolver for RealDnsResolver {
    fn lookup_addr(&self, ip: &std::net::IpAddr) -> std::io::Result<String> {
        dns_lookup::lookup_addr(ip)
    }

    fn lookup_host(&self, host: &str) -> std::io::Result<Vec<std::net::IpAddr>> {
        dns_lookup::lookup_host(host).map(|ips| ips.collect())
    }
}

fn perform_dns_lookup_impl(query: String, resolver: &dyn DnsResolver) -> Result<Vec<String>, String> {
    // If it parses as an IP, try reverse lookup
    if let Ok(ip) = query.parse::<std::net::IpAddr>() {
        match resolver.lookup_addr(&ip) {
            Ok(host) => Ok(vec![host]),
            Err(e) => Err(format!("Reverse DNS lookup failed: {}", e)),
        }
    } else {
        // Forward lookup
        match resolver.lookup_host(&query) {
            Ok(ips) => {
                let mut unique_ips = Vec::new();
                for ip in ips {
                    let ip_str = ip.to_string();
                    if !unique_ips.contains(&ip_str) {
                        unique_ips.push(ip_str);
                    }
                }
                if unique_ips.is_empty() {
                    Err("No IP addresses found".to_string())
                } else {
                    Ok(unique_ips)
                }
            }
            Err(e) => Err(format!("DNS lookup failed: {}", e)),
        }
    }
}

#[tauri::command]
fn perform_dns_lookup(query: String) -> Result<Vec<String>, String> {
    perform_dns_lookup_impl(query, &RealDnsResolver)
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
fn broadcast_ui_settings(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    app.emit("ui-settings-changed", ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_packet_capture(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>) -> Result<(), String> {
    let mut flag_lock = state.capture_flag.lock().unwrap();
    if let Some(old_flag) = flag_lock.take() {
        old_flag.store(false, Ordering::Relaxed);
    }
    if let Ok(conn) = db_state.conn.lock() {
        let _ = database::log_audit_event(&conn, "SYSTEM_EVENT", "WARNING", "Packet Capture Stopped", "Packet capturing thread terminated via UI.");
    }
    Ok(())
}

#[tauri::command]
fn block_ip(
    ip: String, 
    reason: Option<String>,
    state: State<'_, AppState>,
    db_state: State<'_, database::DatabaseState>,
) -> Result<(), String> {
    if ip.parse::<std::net::IpAddr>().is_err() {
        return Err(format!("Invalid IP address format: {}", ip));
    }

    {
        let w_ips = state.whitelisted_ips.read().unwrap();
        if w_ips.contains(&ip) {
            return Err(format!("IP {} is currently whitelisted. Cannot block.", ip));
        }
    }
    {
        let b_ips = state.blocked_ips.read().unwrap();
        if b_ips.contains(&ip) {
            return Err(format!("IP {} is already blocked.", ip));
        }
    }

    let reason_str = reason.unwrap_or_else(|| "Manual Block".to_string());
    if let Ok(conn) = db_state.conn.lock() {
        let _ = database::insert_blocked_ip(&conn, &ip, &reason_str);
        let _ = database::log_audit_event(&conn, "USER_ACTION", "INFO", "IP Blocked", &format!("IP: {}, Reason: {}", ip, reason_str));
    }
    
    let mut ips = state.blocked_ips.write().unwrap();
    if !ips.contains(&ip) {
        ips.push(ip);
        let mut engine = state.ips_engine.lock().unwrap();
        let w_ips = state.whitelisted_ips.read().unwrap().clone();
        engine.start(ips.clone(), state.custom_rules.read().unwrap().clone(), w_ips).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn unblock_ip(
    ip: String, 
    state: State<'_, AppState>,
    db_state: State<'_, database::DatabaseState>,
) -> Result<(), String> {
    if let Ok(conn) = db_state.conn.lock() {
        let _ = database::remove_blocked_ip(&conn, &ip);
        let _ = database::log_audit_event(&conn, "USER_ACTION", "INFO", "IP Unblocked", &format!("IP: {}", ip));
    }
    
    let mut ips = state.blocked_ips.write().unwrap();
    if let Some(pos) = ips.iter().position(|x| x == &ip) {
        ips.remove(pos);
        let mut engine = state.ips_engine.lock().unwrap();
        let w_ips = state.whitelisted_ips.read().unwrap().clone();
        engine.start(ips.clone(), state.custom_rules.read().unwrap().clone(), w_ips).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_blocked_ips(db_state: State<'_, database::DatabaseState>) -> Result<Vec<database::BlockedIpData>, String> {
    let conn = db_state.conn.lock().unwrap();
    database::get_blocked_ips(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn whitelist_ip(
    ip: String, 
    reason: Option<String>,
    state: State<'_, AppState>,
    db_state: State<'_, database::DatabaseState>,
) -> Result<(), String> {
    if ip.parse::<std::net::IpAddr>().is_err() {
        return Err(format!("Invalid IP address format: {}", ip));
    }

    {
        let b_ips = state.blocked_ips.read().unwrap();
        if b_ips.contains(&ip) {
            return Err(format!("IP {} is currently blocked. Cannot whitelist.", ip));
        }
    }
    {
        let w_ips = state.whitelisted_ips.read().unwrap();
        if w_ips.contains(&ip) {
            return Err(format!("IP {} is already whitelisted.", ip));
        }
    }

    let reason_str = reason.unwrap_or_else(|| "Manual Whitelist".to_string());
    if let Ok(conn) = db_state.conn.lock() {
        let _ = database::insert_whitelisted_ip(&conn, &ip, &reason_str);
        let _ = database::log_audit_event(&conn, "USER_ACTION", "INFO", "IP Whitelisted", &format!("IP: {}, Reason: {}", ip, reason_str));
    }
    
    let mut ips = state.whitelisted_ips.write().unwrap();
    if !ips.contains(&ip) {
        ips.push(ip);
        let mut engine = state.ips_engine.lock().unwrap();
        let blocked = state.blocked_ips.read().unwrap().clone();
        engine.start(blocked, state.custom_rules.read().unwrap().clone(), ips.clone()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn remove_whitelisted_ip(
    ip: String, 
    state: State<'_, AppState>,
    db_state: State<'_, database::DatabaseState>,
) -> Result<(), String> {
    if let Ok(conn) = db_state.conn.lock() {
        let _ = database::remove_whitelisted_ip(&conn, &ip);
        let _ = database::log_audit_event(&conn, "USER_ACTION", "INFO", "IP Removed from Whitelist", &format!("IP: {}", ip));
    }
    
    let mut ips = state.whitelisted_ips.write().unwrap();
    if let Some(pos) = ips.iter().position(|x| x == &ip) {
        ips.remove(pos);
        let mut engine = state.ips_engine.lock().unwrap();
        let blocked = state.blocked_ips.read().unwrap().clone();
        engine.start(blocked, state.custom_rules.read().unwrap().clone(), ips.clone()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_whitelisted_ips(db_state: State<'_, database::DatabaseState>) -> Result<Vec<database::WhitelistedIpData>, String> {
    let conn = db_state.conn.lock().unwrap();
    database::get_whitelisted_ips(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_dropped_packets(state: State<'_, AppState>) -> Result<usize, String> {
    let engine = state.ips_engine.lock().unwrap();
    Ok(engine.get_dropped_count())
}

#[tauri::command]
fn test_connection(ip: String) -> Result<String, String> {
    use std::net::{TcpStream, SocketAddr};
    use std::str::FromStr;
    
    let addr = format!("{}:80", ip);
    let socket_addr = match SocketAddr::from_str(&addr) {
        Ok(sa) => sa,
        Err(e) => return Err(format!("Invalid IP address format: {}", e)),
    };
    let timeout = std::time::Duration::from_secs(3);
    
    match TcpStream::connect_timeout(&socket_addr, timeout) {
        Ok(_) => Ok("Connected successfully! The IPS ALLOWED the traffic.".to_string()),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::TimedOut {
                Ok("Connection timed out! This usually means the IPS successfully DROPPED the packets (or the server is simply unresponsive to port 80).".to_string())
            } else {
                Ok(format!("Connection refused ({}). The IPS ALLOWED the traffic, but the remote server rejected the connection on port 80.", e))
            }
        }
    }
}

#[tauri::command]
fn trigger_mock_alert(
    app: AppHandle,
    state: State<'_, AppState>,
    db_state: State<'_, database::DatabaseState>,
    severity: String,
    impact: f64,
    src_ip: String,
) -> Result<(), String> {
    if let Ok(conn) = db_state.conn.lock() {
        match database::insert_mock_alert(&conn, &severity, impact, &src_ip) {
            Ok(alert) => {
                let _ = app.emit("intrusion-alert", alert);
                
                // Active IPS Auto-Block Logic
                if (severity == "Critical" || severity == "High") && state.auto_block_enabled.load(Ordering::Relaxed) {
                    let w_ips = state.whitelisted_ips.read().unwrap();
                    if !w_ips.contains(&src_ip) {
                        let _ = database::insert_blocked_ip(&conn, &src_ip, &format!("Auto-Blocked: Mock Alert ({})", severity));
                        let mut ips = state.blocked_ips.write().unwrap();
                        if !ips.contains(&src_ip) {
                            ips.push(src_ip.clone());
                            if let Ok(mut engine) = state.ips_engine.lock() {
                                let _ = engine.start(ips.clone(), state.custom_rules.read().unwrap().clone(), w_ips.clone());
                            }
                        }
                    }
                }
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}

#[tauri::command]
fn add_custom_rule(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>, rule: database::CustomRule) -> Result<i64, String> {
    if let Some(src) = &rule.src_ip {
        if !src.is_empty() && src.parse::<std::net::IpAddr>().is_err() {
            return Err("Invalid source IP address".to_string());
        }
    }
    if let Some(dst) = &rule.dst_ip {
        if !dst.is_empty() && dst.parse::<std::net::IpAddr>().is_err() {
            return Err("Invalid destination IP address".to_string());
        }
    }
    if let Some(p) = &rule.src_port {
        if !p.is_empty() && p.parse::<u16>().is_err() {
            return Err("Invalid source port".to_string());
        }
    }
    if let Some(p) = &rule.dst_port {
        if !p.is_empty() && p.parse::<u16>().is_err() {
            return Err("Invalid destination port".to_string());
        }
    }

    let conn = db_state.conn.lock().unwrap();
    let id = database::insert_custom_rule(&conn, &rule).map_err(|e| e.to_string())?;
    let _ = database::log_audit_event(&conn, "USER_ACTION", "INFO", "Added Custom Rule", &format!("Rule '{}' for protocol {}", rule.name, rule.protocol));
    
    if let Ok(rules) = database::get_custom_rules(&conn) {
        if let Ok(mut cache) = state.custom_rules.write() {
            *cache = rules.clone();
            if let Ok(mut engine) = state.ips_engine.lock() {
                let ips = state.blocked_ips.read().unwrap().clone();
                let w_ips = state.whitelisted_ips.read().unwrap().clone();
                let _ = engine.start(ips, rules, w_ips);
            }
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
    let _ = database::log_audit_event(&conn, "USER_ACTION", "WARNING", "Deleted Custom Rule", &format!("Rule ID: {}", id));
    
    if let Ok(rules) = database::get_custom_rules(&conn) {
        if let Ok(mut cache) = state.custom_rules.write() {
            *cache = rules.clone();
            if let Ok(mut engine) = state.ips_engine.lock() {
                let ips = state.blocked_ips.read().unwrap().clone();
                let w_ips = state.whitelisted_ips.read().unwrap().clone();
                let _ = engine.start(ips, rules, w_ips);
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn edit_custom_rule(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>, id: i64, rule: database::CustomRule) -> Result<(), String> {
    let conn = db_state.conn.lock().unwrap();
    database::update_custom_rule(&conn, id, &rule).map_err(|e| e.to_string())?;
    let _ = database::log_audit_event(&conn, "USER_ACTION", "INFO", "Edited Custom Rule", &format!("Rule ID: {}", id));
    
    if let Ok(rules) = database::get_custom_rules(&conn) {
        if let Ok(mut cache) = state.custom_rules.write() {
            *cache = rules.clone();
            if let Ok(mut engine) = state.ips_engine.lock() {
                let ips = state.blocked_ips.read().unwrap().clone();
                let w_ips = state.whitelisted_ips.read().unwrap().clone();
                let _ = engine.start(ips, rules, w_ips);
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn toggle_custom_rule_state(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>, id: i64, is_active: bool) -> Result<(), String> {
    let conn = db_state.conn.lock().unwrap();
    database::toggle_custom_rule(&conn, id, is_active).map_err(|e| e.to_string())?;
    let action_str = if is_active { "Enabled Custom Rule" } else { "Disabled Custom Rule" };
    let _ = database::log_audit_event(&conn, "USER_ACTION", "INFO", action_str, &format!("Rule ID: {}", id));
    
    if let Ok(rules) = database::get_custom_rules(&conn) {
        if let Ok(mut cache) = state.custom_rules.write() {
            *cache = rules.clone();
            if let Ok(mut engine) = state.ips_engine.lock() {
                let ips = state.blocked_ips.read().unwrap().clone();
                let w_ips = state.whitelisted_ips.read().unwrap().clone();
                let _ = engine.start(ips, rules, w_ips);
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn toggle_auto_block(state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>, enabled: bool) -> Result<(), String> {
    state.auto_block_enabled.store(enabled, Ordering::Relaxed);
    if let Ok(conn) = db_state.conn.lock() {
        let action_str = if enabled { "Enabled IPS Auto-Block" } else { "Disabled IPS Auto-Block" };
        let _ = database::log_audit_event(&conn, "USER_ACTION", "WARNING", action_str, "");
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

    if let Err(e) = packet_capturer::start_capture(interface_name.clone(), bpf_filter.clone(), tx, new_flag) {
        *flag_lock = None;
        if let Some(db_state) = app.try_state::<database::DatabaseState>() {
            if let Ok(conn) = db_state.conn.lock() {
                let _ = database::log_audit_event(&conn, "SYSTEM_EVENT", "CRITICAL", "Capture Engine Failed", &format!("Error: {}", e));
            }
        }
        return Err(e);
    }
    
    if let Some(db_state) = app.try_state::<database::DatabaseState>() {
        if let Ok(conn) = db_state.conn.lock() {
            let _ = database::log_audit_event(&conn, "SYSTEM_EVENT", "INFO", "Packet Capture Started", &format!("Interface: {}, Filter: {}", interface_name, bpf_filter));
        }
    }

    let (ui_tx, ui_rx) = unbounded();

    for _ in 0..4 {
        let rx_clone = rx.clone();
        let ui_tx_clone = ui_tx.clone();
        let app_clone = app.clone();
        
        std::thread::spawn(move || {
            let mut counter = 0u64;
            while let Ok(mut p) = rx_clone.recv() {
                if let Some(db_state) = app_clone.try_state::<database::DatabaseState>() {
                    if let Some(app_state) = app_clone.try_state::<AppState>() {
                        if let Ok(conn) = db_state.conn.lock() {
                            let rules = app_state.custom_rules.read().unwrap();
                            let geoip_lock = app_state.geoip_reader.read().unwrap();
                            
                            // GeoIP Enrichment
                            if let Some(reader) = geoip_lock.as_ref() {
                                if let Some(src_ip_str) = p.ip_src.first() {
                                    if let Ok(ip) = src_ip_str.parse::<std::net::IpAddr>() {
                                        let is_local = match ip {
                                            std::net::IpAddr::V4(ipv4) => ipv4.is_private() || ipv4.is_loopback() || ipv4.is_link_local() || ipv4.is_multicast() || ipv4.is_broadcast(),
                                            std::net::IpAddr::V6(ipv6) => ipv6.is_loopback() || ipv6.is_multicast(),
                                        };
                                        if is_local {
                                            p.src_country = vec!["LOCAL".to_string()];
                                        } else if let Ok(country) = reader.lookup::<maxminddb::geoip2::Country>(ip) {
                                            if let Some(c) = country.country.and_then(|c| c.iso_code) {
                                                p.src_country = vec![c.to_string()];
                                            }
                                        }
                                    }
                                }
                                if let Some(dst_ip_str) = p.ip_dst.first() {
                                    if let Ok(ip) = dst_ip_str.parse::<std::net::IpAddr>() {
                                        let is_local = match ip {
                                            std::net::IpAddr::V4(ipv4) => ipv4.is_private() || ipv4.is_loopback() || ipv4.is_link_local() || ipv4.is_multicast() || ipv4.is_broadcast(),
                                            std::net::IpAddr::V6(ipv6) => ipv6.is_loopback() || ipv6.is_multicast(),
                                        };
                                        if is_local {
                                            p.dst_country = vec!["LOCAL".to_string()];
                                        } else if let Ok(country) = reader.lookup::<maxminddb::geoip2::Country>(ip) {
                                            if let Some(c) = country.country.and_then(|c| c.iso_code) {
                                                p.dst_country = vec![c.to_string()];
                                            }
                                        }
                                    }
                                }
                            }

                            let enable_malware_sigs = app_state.malware_signatures_enabled.load(Ordering::Relaxed);
                            let threat_ips_lock = app_state.threat_ips.read().unwrap();
                            if let Ok(Some(alert)) = database::insert_packet(&conn, &mut p, &mut counter, &rules, enable_malware_sigs, &threat_ips_lock) {
                                let _ = app_clone.emit("intrusion-alert", alert.clone());
                                
                                // Auto-Block logic for live traffic
                                if (alert.severity == "Critical" || alert.severity == "High") && app_state.auto_block_enabled.load(Ordering::Relaxed) && !alert.src_ip.is_empty() {
                                    let w_ips = app_state.whitelisted_ips.read().unwrap();
                                    if !w_ips.contains(&alert.src_ip) {
                                        let _ = database::insert_blocked_ip(&conn, &alert.src_ip, &format!("Auto-Blocked: Alert ID #{}", alert.id));
                                        let mut ips = app_state.blocked_ips.write().unwrap();
                                        if !ips.contains(&alert.src_ip) {
                                            ips.push(alert.src_ip.clone());
                                            if let Ok(mut engine) = app_state.ips_engine.lock() {
                                                let _ = engine.start(ips.clone(), app_state.custom_rules.read().unwrap().clone(), w_ips.clone());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                let _ = ui_tx_clone.send(p);
            }
        });
    }

    let app_clone_ui = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut batch = Vec::new();
        let mut last_emit = std::time::Instant::now();

        while let Ok(packet) = ui_rx.recv() {
            batch.push(packet);
            
            while let Ok(p) = ui_rx.try_recv() {
                batch.push(p);
                if batch.len() >= 200 {
                    break;
                }
            }

            if batch.len() >= 50 || last_emit.elapsed().as_millis() >= 100 {
                let _ = app_clone_ui.emit("packets-batch", batch.clone());
                batch.clear();
                last_emit = std::time::Instant::now();
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn get_audit_logs(
    log_type: Option<String>,
    limit: i64,
    offset: i64,
    start_date: Option<String>,
    end_date: Option<String>,
    category: Option<String>,
    db_state: State<'_, database::DatabaseState>,
) -> Result<Vec<database::AuditLog>, String> {
    let conn = db_state.conn.lock().unwrap();
    database::get_audit_logs(&conn, log_type, limit, offset, start_date, end_date, category).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_audit_logs(db_state: State<'_, database::DatabaseState>) -> Result<(), String> {
    let conn = db_state.conn.lock().unwrap();
    database::clear_audit_logs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn fetch_settings(db_state: State<'_, database::DatabaseState>) -> Result<std::collections::HashMap<String, String>, String> {
    let conn = db_state.conn.lock().unwrap();
    database::get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_settings(db_state: State<'_, database::DatabaseState>, settings: std::collections::HashMap<String, String>) -> Result<(), String> {
    let conn = db_state.conn.lock().unwrap();
    database::update_settings(&conn, &settings).map_err(|e| e.to_string())?;
    let _ = database::log_audit_event(&conn, "SYSTEM", "INFO", "Updated Settings", "System settings were updated via the UI");
    Ok(())
}

#[tauri::command]
fn get_malware_settings(state: State<'_, AppState>) -> MalwareSettings {
    MalwareSettings {
        engine_enabled: state.malware_engine_enabled.load(Ordering::Relaxed),
        active_mode: state.malware_active_mode.load(Ordering::Relaxed),
        protections: MalwareProtections {
            signatures: state.malware_signatures_enabled.load(Ordering::Relaxed),
            heuristics: state.malware_heuristics_enabled.load(Ordering::Relaxed),
            auto_ban: state.malware_autoban_enabled.load(Ordering::Relaxed),
        },
    }
}

#[tauri::command]
fn set_malware_setting(state: State<'_, AppState>, key: String, value: bool) -> Result<(), String> {
    match key.as_str() {
        "engineEnabled" => { state.malware_engine_enabled.store(value, Ordering::Relaxed); }
        "activeMode" => { state.malware_active_mode.store(value, Ordering::Relaxed); }
        "signatures" => { state.malware_signatures_enabled.store(value, Ordering::Relaxed); }
        "heuristics" => { state.malware_heuristics_enabled.store(value, Ordering::Relaxed); }
        "autoBan" => { state.malware_autoban_enabled.store(value, Ordering::Relaxed); }
        _ => return Err(format!("Unknown setting key: {}", key)),
    }
    Ok(())
}

#[tauri::command]
async fn sync_threat_feeds(app_state: State<'_, AppState>, db_state: State<'_, database::DatabaseState>) -> Result<Vec<threat_feed::ThreatIndicator>, String> {
    let indicators = threat_feed::sync_all_feeds().await?;
    
    // Update DB
    let mut conn = db_state.conn.lock().unwrap();
    database::save_threat_indicators(&mut conn, &indicators).map_err(|e| e.to_string())?;
    
    // Update Memory State
    let mut ips_set = app_state.threat_ips.write().unwrap();
    for ind in &indicators {
        ips_set.insert(ind.indicator.clone());
    }

    Ok(indicators)
}

#[tauri::command]
fn get_threat_feeds(db_state: State<'_, database::DatabaseState>) -> Result<Vec<threat_feed::ThreatIndicator>, String> {
    let conn = db_state.conn.lock().unwrap();
    database::get_all_threat_indicators(&conn).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_state = database::init_db(app_dir.clone()).expect("Failed to initialize database");
    
            let custom_rules = database::get_custom_rules(&db_state.conn.lock().unwrap()).unwrap_or_default();
            
            let blocked_ips_data = database::get_blocked_ips(&db_state.conn.lock().unwrap()).unwrap_or_default();
            let blocked_ips_strings = blocked_ips_data.into_iter().map(|b| b.ip).collect::<Vec<String>>();

            let whitelisted_ips_data = database::get_whitelisted_ips(&db_state.conn.lock().unwrap()).unwrap_or_default();
            let whitelisted_ips_strings = whitelisted_ips_data.into_iter().map(|b| b.ip).collect::<Vec<String>>();

            let geoip_reader = Arc::new(RwLock::new(None));
            let geoip_reader_clone = geoip_reader.clone();
            let app_dir_clone = app_dir.clone();

            tauri::async_runtime::spawn(async move {
                let db_path = app_dir_clone.join("GeoLite2-Country.mmdb");
                if !db_path.exists() {
                    println!("Downloading GeoLite2-Country.mmdb...");
                    if let Ok(response) = reqwest::get("https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb").await {
                        if let Ok(bytes) = response.bytes().await {
                            let _ = std::fs::write(&db_path, bytes);
                            println!("Downloaded GeoLite2-Country.mmdb");
                        }
                    }
                }

                if let Ok(bytes) = std::fs::read(&db_path) {
                    if let Ok(reader) = maxminddb::Reader::from_source(bytes) {
                        if let Ok(mut lock) = geoip_reader_clone.write() {
                            *lock = Some(reader);
                            println!("GeoIP Reader loaded successfully.");
                        }
                    }
                }
            });

            // If IPS was active previously and we have blocked IPs or custom rules, we should theoretically start it.
            let mut ips_engine = IpsEngine::new();
            if !blocked_ips_strings.is_empty() || !custom_rules.is_empty() {
                // To safely start it, we would apply the filter immediately
                let _ = ips_engine.start(blocked_ips_strings.clone(), custom_rules.clone(), whitelisted_ips_strings.clone());
            }

            let threat_intel_inds = database::get_all_threat_indicators(&db_state.conn.lock().unwrap()).unwrap_or_default();
            let mut threat_ips_set = HashSet::new();
            for ind in threat_intel_inds {
                threat_ips_set.insert(ind.indicator);
            }

            app.manage(db_state);
            app.manage(AppState {
                capture_flag: Mutex::new(None),
                custom_rules: RwLock::new(custom_rules),
                geoip_reader,
                ips_engine: Arc::new(Mutex::new(ips_engine)),
                blocked_ips: Arc::new(RwLock::new(blocked_ips_strings)),
                whitelisted_ips: Arc::new(RwLock::new(whitelisted_ips_strings)),
                auto_block_enabled: Arc::new(AtomicBool::new(false)),
                malware_engine_enabled: Arc::new(AtomicBool::new(true)),
                malware_active_mode: Arc::new(AtomicBool::new(true)),
                malware_signatures_enabled: Arc::new(AtomicBool::new(true)),
                malware_heuristics_enabled: Arc::new(AtomicBool::new(false)),
                malware_autoban_enabled: Arc::new(AtomicBool::new(true)),
                threat_ips: Arc::new(RwLock::new(threat_ips_set)),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_network_interfaces,
            start_packet_capture,
            stop_packet_capture,
            get_historical_packets,
            get_alerts,
            get_telemetry_stats,
            perform_dns_lookup,
            sync_threat_feeds,
            get_threat_feeds,
            add_custom_rule,
            edit_custom_rule,
            fetch_custom_rules,
            remove_custom_rule,
            toggle_custom_rule_state,
            get_system_health_stats,
            clear_database,
            block_ip,
            unblock_ip,
            get_blocked_ips,
            whitelist_ip,
            remove_whitelisted_ip,
            get_whitelisted_ips,
            get_dropped_packets,
            test_connection,
            trigger_mock_alert,
            get_audit_logs,
            clear_audit_logs,
            fetch_settings,
            save_settings,
            broadcast_ui_settings,
            toggle_auto_block,
            get_malware_settings,
            set_malware_setting,
            save_snapshot,
            restore_snapshot,
            get_pdf_report_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn save_snapshot(app: tauri::AppHandle, destination: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let db_path = app_dir.join("guard_shield.db");
    std::fs::copy(&db_path, &destination).map_err(|e| format!("Failed to save snapshot: {}", e))?;
    Ok(())
}

#[tauri::command]
fn restore_snapshot(app: tauri::AppHandle, source: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let db_path = app_dir.join("guard_shield.db");
    std::fs::copy(&source, &db_path).map_err(|e| format!("Failed to restore snapshot: {}", e))?;
    app.restart();
}

#[tauri::command]
fn get_pdf_report_data(
    db_state: tauri::State<'_, database::DatabaseState>,
    time_range_hours: u32,
) -> Result<database::ReportData, String> {
    let conn = db_state.conn.lock().unwrap();
    database::get_pdf_report_data(&conn, time_range_hours).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::IpAddr;
    use std::io::{Error, ErrorKind};

    struct MockDnsResolver {
        // Maps a host name to list of resolved IpAddrs or an error
        hosts: std::collections::HashMap<String, std::io::Result<Vec<IpAddr>>>,
        // Maps an IpAddr to a host name or an error
        addrs: std::collections::HashMap<IpAddr, std::io::Result<String>>,
    }

    impl DnsResolver for MockDnsResolver {
        fn lookup_addr(&self, ip: &IpAddr) -> std::io::Result<String> {
            if let Some(res) = self.addrs.get(ip) {
                match res {
                    Ok(host) => Ok(host.clone()),
                    Err(e) => Err(Error::new(e.kind(), e.to_string())),
                }
            } else {
                Err(Error::new(ErrorKind::NotFound, "not found"))
            }
        }

        fn lookup_host(&self, host: &str) -> std::io::Result<Vec<IpAddr>> {
            if let Some(res) = self.hosts.get(host) {
                match res {
                    Ok(ips) => Ok(ips.clone()),
                    Err(e) => Err(Error::new(e.kind(), e.to_string())),
                }
            } else {
                Err(Error::new(ErrorKind::NotFound, "not found"))
            }
        }
    }

    #[test]
    fn test_forward_lookup_success() {
        let mut hosts = std::collections::HashMap::new();
        let ip1 = "1.2.3.4".parse::<IpAddr>().unwrap();
        let ip2 = "5.6.7.8".parse::<IpAddr>().unwrap();
        hosts.insert("example.com".to_string(), Ok(vec![ip1, ip2]));

        let resolver = MockDnsResolver {
            hosts,
            addrs: std::collections::HashMap::new(),
        };

        let result = perform_dns_lookup_impl("example.com".to_string(), &resolver);
        assert_eq!(result, Ok(vec!["1.2.3.4".to_string(), "5.6.7.8".to_string()]));
    }

    #[test]
    fn test_forward_lookup_dedup() {
        let mut hosts = std::collections::HashMap::new();
        let ip1 = "1.2.3.4".parse::<IpAddr>().unwrap();
        let ip2 = "1.2.3.4".parse::<IpAddr>().unwrap();
        hosts.insert("example.com".to_string(), Ok(vec![ip1, ip2]));

        let resolver = MockDnsResolver {
            hosts,
            addrs: std::collections::HashMap::new(),
        };

        let result = perform_dns_lookup_impl("example.com".to_string(), &resolver);
        assert_eq!(result, Ok(vec!["1.2.3.4".to_string()]));
    }

    #[test]
    fn test_forward_lookup_empty() {
        let mut hosts = std::collections::HashMap::new();
        hosts.insert("empty.com".to_string(), Ok(vec![]));

        let resolver = MockDnsResolver {
            hosts,
            addrs: std::collections::HashMap::new(),
        };

        let result = perform_dns_lookup_impl("empty.com".to_string(), &resolver);
        assert_eq!(result, Err("No IP addresses found".to_string()));
    }

    #[test]
    fn test_forward_lookup_failure() {
        let mut hosts = std::collections::HashMap::new();
        hosts.insert(
            "fail.com".to_string(),
            Err(Error::new(ErrorKind::ConnectionRefused, "dns resolution failed")),
        );

        let resolver = MockDnsResolver {
            hosts,
            addrs: std::collections::HashMap::new(),
        };

        let result = perform_dns_lookup_impl("fail.com".to_string(), &resolver);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("DNS lookup failed"));
    }

    #[test]
    fn test_reverse_lookup_success() {
        let mut addrs = std::collections::HashMap::new();
        let ip = "8.8.8.8".parse::<IpAddr>().unwrap();
        addrs.insert(ip, Ok("dns.google".to_string()));

        let resolver = MockDnsResolver {
            hosts: std::collections::HashMap::new(),
            addrs,
        };

        let result = perform_dns_lookup_impl("8.8.8.8".to_string(), &resolver);
        assert_eq!(result, Ok(vec!["dns.google".to_string()]));
    }

    #[test]
    fn test_reverse_lookup_failure() {
        let mut addrs = std::collections::HashMap::new();
        let ip = "8.8.8.8".parse::<IpAddr>().unwrap();
        addrs.insert(
            ip,
            Err(Error::new(ErrorKind::Other, "reverse lookup failed")),
        );

        let resolver = MockDnsResolver {
            hosts: std::collections::HashMap::new(),
            addrs,
        };

        let result = perform_dns_lookup_impl("8.8.8.8".to_string(), &resolver);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Reverse DNS lookup failed"));
    }
}
