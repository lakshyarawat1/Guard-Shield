use rusqlite::{Connection, Result, params};
use std::sync::Mutex;
use std::path::PathBuf;
use crate::packet_capturer::PacketData;
use serde::{Deserialize, Serialize};
use chrono::Local;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AlertData {
    pub id: i64,
    pub timestamp: String,
    pub impact_score: f64,
    pub severity: String,
    pub port: String,
    pub protocol: String,
    pub info: String,
    pub payload: String,
    pub src_country: String,
    pub dst_country: String,
    pub src_ip: String,
    pub src_lat: Option<f64>,
    pub src_lon: Option<f64>,
    pub dst_lat: Option<f64>,
    pub dst_lon: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BlockedIpData {
    pub id: i64,
    pub ip: String,
    pub reason: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WhitelistedIpData {
    pub id: i64,
    pub ip: String,
    pub reason: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AuditLog {
    pub id: i64,
    pub timestamp: String,
    pub log_type: String,
    pub severity: String,
    pub action: String,
    pub details: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CustomRule {
    pub id: Option<i64>,
    pub name: String,
    pub description: String,
    pub action: String,
    pub src_ip: Option<String>,
    pub dst_ip: Option<String>,
    pub protocol: String,
    pub src_port: Option<String>,
    pub dst_port: Option<String>,
    pub direction: String,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TelemetryStats {
    pub total_alerts: i64,
    pub last_24h_alerts: i64,
}

pub struct DatabaseState {
    pub conn: Mutex<Connection>,
}

pub fn init_db(app_dir: PathBuf) -> Result<DatabaseState> {
    std::fs::create_dir_all(&app_dir).unwrap_or_default();
    let db_path = app_dir.join("guard_shield.db");
    let conn = Connection::open(db_path)?;

    // Enable WAL (Write-Ahead Logging) mode and optimize synchronization settings
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS packets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            frame_time TEXT,
            frame_len TEXT,
            ip_src TEXT,
            ip_dst TEXT,
            ip_proto TEXT,
            ip_ttl TEXT,
            tcp_srcport TEXT,
            tcp_dstport TEXT,
            tcp_flags TEXT,
            udp_srcport TEXT,
            udp_dstport TEXT,
            ws_col_info TEXT,
            eth_src TEXT,
            eth_dst TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            impact_score REAL,
            severity TEXT,
            port TEXT,
            protocol TEXT,
            info TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS custom_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            action TEXT NOT NULL,
            src_ip TEXT,
            dst_ip TEXT,
            protocol TEXT NOT NULL,
            src_port TEXT,
            dst_port TEXT,
            direction TEXT NOT NULL DEFAULT 'Inbound',
            is_active BOOLEAN NOT NULL DEFAULT 1
        )",
        [],
    )?;
    
    // Add direction column if missing (migration)
    let _ = conn.execute("ALTER TABLE custom_rules ADD COLUMN direction TEXT NOT NULL DEFAULT 'Inbound'", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS blocked_ips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT UNIQUE NOT NULL,
            reason TEXT,
            timestamp TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS whitelisted_ips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT UNIQUE NOT NULL,
            reason TEXT,
            timestamp TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS threat_intelligence (
            id TEXT PRIMARY KEY,
            indicator TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            provider TEXT NOT NULL,
            category TEXT NOT NULL,
            confidence TEXT NOT NULL,
            date_added TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            log_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT
        )",
        [],
    )?;

    // Add payload columns if they don't exist (non-destructive migration)
    let _ = conn.execute("ALTER TABLE packets ADD COLUMN payload TEXT", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN payload TEXT", []);
    let _ = conn.execute("ALTER TABLE packets ADD COLUMN src_country TEXT", []);
    let _ = conn.execute("ALTER TABLE packets ADD COLUMN dst_country TEXT", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN src_country TEXT", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN dst_country TEXT", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN src_ip TEXT", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN src_lat REAL", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN src_lon REAL", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN dst_lat REAL", []);
    let _ = conn.execute("ALTER TABLE alerts ADD COLUMN dst_lon REAL", []);

    // ⚡ Bolt Optimization: Add index to speed up `get_telemetry_stats` range query on `timestamp`.
    // Turns O(N) full table scan into an O(log N) index lookup.
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp)", []);

    Ok(DatabaseState { conn: Mutex::new(conn) })
}

pub fn insert_packet(
    conn: &Connection, 
    p: &PacketData, 
    counter: &mut u64, 
    custom_rules: &[CustomRule], 
    enable_malware_sigs: bool,
    threat_ips: &std::collections::HashSet<String>
) -> Result<Option<AlertData>> {
    let payload = p.payload.first().map(|s| s.as_str()).unwrap_or("");
    let src_country = p.src_country.first().map(|s| s.as_str()).unwrap_or("");
    let dst_country = p.dst_country.first().map(|s| s.as_str()).unwrap_or("");

    conn.execute(
        "INSERT INTO packets (
            frame_time, frame_len, ip_src, ip_dst, ip_proto, ip_ttl, 
            tcp_srcport, tcp_dstport, tcp_flags, udp_srcport, udp_dstport, ws_col_info, eth_src, eth_dst, payload, src_country, dst_country
        ) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            p.frame_time.first().map(|s| s.as_str()).unwrap_or(""),
            p.frame_len.first().map(|s| s.as_str()).unwrap_or(""),
            p.ip_src.first().map(|s| s.as_str()).unwrap_or(""),
            p.ip_dst.first().map(|s| s.as_str()).unwrap_or(""),
            p.ip_proto.first().map(|s| s.as_str()).unwrap_or(""),
            p.ip_ttl.first().map(|s| s.as_str()).unwrap_or(""),
            p.tcp_srcport.first().map(|s| s.as_str()).unwrap_or(""),
            p.tcp_dstport.first().map(|s| s.as_str()).unwrap_or(""),
            p.tcp_flags.first().map(|s| s.as_str()).unwrap_or(""),
            p.udp_srcport.first().map(|s| s.as_str()).unwrap_or(""),
            p.udp_dstport.first().map(|s| s.as_str()).unwrap_or(""),
            p._ws_col_info.first().map(|s| s.as_str()).unwrap_or(""),
            p.eth_src.first().map(|s| s.as_str()).unwrap_or(""),
            p.eth_dst.first().map(|s| s.as_str()).unwrap_or(""),
            payload,
            src_country,
            dst_country
        ],
    )?;

    *counter += 1;
    if (*counter).is_multiple_of(500) {
        let _ = conn.execute("DELETE FROM packets WHERE id NOT IN (SELECT id FROM packets ORDER BY id DESC LIMIT 10000)", []);
    }

    let mut alert = None;
    let proto = p.ip_proto.first().map(|s| s.as_str()).unwrap_or("");
    let mut impact_score = 0.0;
    let mut severity = String::new();
    let mut port = String::new();
    let mut protocol_str = String::new();
    let mut info = String::new();

    let src_ip = p.ip_src.first().map(|s| s.as_str()).unwrap_or("");
    let dst_ip = p.ip_dst.first().map(|s| s.as_str()).unwrap_or("");
    
    // 0. Threat Intelligence OSINT Matching
    if threat_ips.contains(src_ip) {
        impact_score = 9.8;
        info = "Malicious IP detected in Threat Feed (Source)".to_string();
    } else if threat_ips.contains(dst_ip) {
        impact_score = 9.8;
        info = "Malicious IP detected in Threat Feed (Destination)".to_string();
    }
    let dst_ip = p.ip_dst.first().map(|s| s.as_str()).unwrap_or("");
    
    let default_empty = String::new();
    let src_port_ref = p.tcp_srcport.first().unwrap_or_else(|| p.udp_srcport.first().unwrap_or(&default_empty));
    let dst_port_ref = p.tcp_dstport.first().unwrap_or_else(|| p.udp_dstport.first().unwrap_or(&default_empty));
    
    let src_lat = p.src_lat.first().and_then(|s| s.parse::<f64>().ok());
    let src_lon = p.src_lon.first().and_then(|s| s.parse::<f64>().ok());
    let dst_lat = p.dst_lat.first().and_then(|s| s.parse::<f64>().ok());
    let dst_lon = p.dst_lon.first().and_then(|s| s.parse::<f64>().ok());
    
    let src_port = src_port_ref.as_str();
    let dst_port = dst_port_ref.as_str();

    let proto_name = if proto == "6" { "TCP" } else if proto == "17" { "UDP" } else if proto == "1" { "ICMP" } else { "Any" };

    // Determine packet direction for rule evaluation
    let packet_direction = if let Ok(ip) = src_ip.parse::<std::net::IpAddr>() {
        let is_local = match ip {
            std::net::IpAddr::V4(ipv4) => ipv4.is_private() || ipv4.is_loopback() || ipv4.is_link_local() || ipv4.is_multicast() || ipv4.is_broadcast(),
            std::net::IpAddr::V6(ipv6) => ipv6.is_loopback() || ipv6.is_multicast(),
        };
        if is_local { "Outbound" } else { "Inbound" }
    } else {
        "Inbound" // Default fallback
    };

    // 1. Evaluate Custom Rules first
    for rule in custom_rules {
        if !rule.is_active { continue; }
        
        let dir_match = rule.direction == "Both" || rule.direction == packet_direction;
        if !dir_match { continue; }
        
        let proto_match = rule.protocol == "Any" || rule.protocol == proto_name;
        let src_ip_match = rule.src_ip.as_deref().unwrap_or("").is_empty() || rule.src_ip.as_deref().unwrap_or("") == src_ip;
        let dst_ip_match = rule.dst_ip.as_deref().unwrap_or("").is_empty() || rule.dst_ip.as_deref().unwrap_or("") == dst_ip;
        let src_port_match = rule.src_port.as_deref().unwrap_or("").is_empty() || rule.src_port.as_deref().unwrap_or("") == src_port;
        let dst_port_match = rule.dst_port.as_deref().unwrap_or("").is_empty() || rule.dst_port.as_deref().unwrap_or("") == dst_port;

        if proto_match && src_ip_match && dst_ip_match && src_port_match && dst_port_match {
            impact_score = 10.0; // Custom rules are high priority
            severity = "Critical".to_string();        
            port = dst_port.to_string();
            protocol_str = proto_name.to_string();
            info = rule.name.clone();
            break; // Stop evaluating after first custom rule match
        }
    }

    // 2. Evaluate Deep Packet Inspection (DPI) Signatures
    if info.is_empty() {
        let json_rules: Vec<serde_json::Value> = serde_json::from_str(include_str!("rules.json")).unwrap_or_default();
        for r in json_rules {
            if let (Some(msg), Some(cat)) = (r.get("msg").and_then(|v| v.as_str()), r.get("category").and_then(|v| v.as_str())) {
                if !enable_malware_sigs && cat == "malware_c2" {
                    continue;
                }
                
                let r_proto = r.get("protocol").and_then(|v| v.as_str()).unwrap_or("Any");
                if r_proto != "Any" && !proto_name.eq_ignore_ascii_case(r_proto) {
                    continue;
                }

                let mut r_dst_port = String::new();
                if let Some(v) = r.get("dst_port") {
                    if let Some(s) = v.as_str() {
                        r_dst_port = s.to_string();
                    } else if let Some(n) = v.as_u64() {
                        r_dst_port = n.to_string();
                    }
                }
                
                if !r_dst_port.is_empty() && r_dst_port.to_lowercase() != "any" && r_dst_port.to_lowercase() != "n/a" {
                    if r_dst_port != dst_port {
                        continue;
                    }
                }

                let mut condition_matched = true;
                if let Some(conds) = r.get("conditions") {
                    if conds.get("packet_count_threshold").is_some() {
                        condition_matched = false; // Stateless check shouldn't trigger stateful rules
                    }
                    if let Some(flags) = conds.get("tcp_flags").and_then(|v| v.as_array()) {
                        let pkt_flags = p.tcp_flags.first().map(|s| s.as_str()).unwrap_or("");
                        for flag in flags {
                            if let Some(f_str) = flag.as_str() {
                                if !pkt_flags.contains(f_str) {
                                    condition_matched = false;
                                    break;
                                }
                            }
                        }
                        if flags.is_empty() && !pkt_flags.contains("0x000") {
                            condition_matched = false;
                        }
                    }
                    if let Some(pattern) = conds.get("payload_pattern").and_then(|v| v.as_str()) {
                        if payload.is_empty() || !payload.contains(pattern) {
                            condition_matched = false;
                        }
                    }
                } else {
                    let content = r.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    if !content.is_empty() && !payload.contains(content) {
                        condition_matched = false;
                    }
                }

                let rule_cat = r.get("category").and_then(|v| v.as_str()).unwrap_or("");
                if packet_direction == "Outbound" && rule_cat != "malware_c2" {
                    condition_matched = false;
                }

                if !condition_matched {
                    continue;
                }

                impact_score = r.get("impact_score").and_then(|v| v.as_f64()).unwrap_or(5.0);
                let raw_sev = r.get("severity").and_then(|v| v.as_str()).unwrap_or("High");
                severity = match raw_sev.to_lowercase().as_str() {
                    "critical" => "Critical".to_string(),
                    "high" => "High".to_string(),
                    "medium" => "Medium".to_string(),
                    "low" => "Low".to_string(),
                    _ => "Medium".to_string(),
                };
                port = dst_port.to_string();
                protocol_str = proto_name.to_string();
                info = msg.to_string();
                break;
            }
        }
    }

    // 2. Evaluate Deep Packet Inspection (DPI) Signatures
    let is_web_response = packet_direction == "Inbound" && (src_port == "80" || src_port == "443" || src_port == "8080");
    if impact_score == 0.0 && !payload.is_empty() && !is_web_response {
        let payload_lower = payload.to_lowercase();
        
        if payload_lower.contains("union select ") || payload_lower.contains(" drop table ") {
            impact_score = 8.5;
            severity = "High".to_string();
            port = dst_port.to_string();
            protocol_str = proto_name.to_string();
            info = "SQL Injection Attempt".to_string();
        } else if payload_lower.contains("<script>") || payload_lower.contains("javascript:") {
            impact_score = 7.0;
            severity = "Medium".to_string();
            port = dst_port.to_string();
            protocol_str = proto_name.to_string();
            info = "Cross-Site Scripting (XSS) Attempt".to_string();
        } else if payload_lower.contains("../../../") || payload_lower.contains("..\\..\\..\\") || payload_lower.contains("/etc/passwd") {
            impact_score = 9.0;
            severity = "Critical".to_string();
            port = dst_port.to_string();
            protocol_str = proto_name.to_string();
            info = "Directory Traversal Attempt".to_string();
        } else if payload_lower.contains("eval(") || payload_lower.contains("base64_decode(") {
            impact_score = 9.5;
            severity = "Critical".to_string();
            port = dst_port.to_string();
            protocol_str = proto_name.to_string();
            info = "Suspicious Code Execution".to_string();
        }
    }

    // 3. Evaluate Hardcoded Rules only if no custom rule or DPI matched
    if impact_score == 0.0 && packet_direction == "Inbound" {
        if proto == "1" { 
            impact_score = 2.0;
            severity = "Low".to_string();
            port = "N/A".to_string();
            protocol_str = "ICMP".to_string();
            info = "Possible ICMP Ping".to_string();
        } else if proto == "6" { 
            let dst_port = p.tcp_dstport.first().map(|s| s.as_str()).unwrap_or("");
            if dst_port == "23" {
                impact_score = 8.5;
                severity = "High".to_string();
                port = "23".to_string();
                protocol_str = "TCP".to_string();
                info = "Telnet connection attempt (insecure)".to_string();
            } else if dst_port == "22" {
                impact_score = 4.0;
                severity = "Medium".to_string();
                port = "22".to_string();
                protocol_str = "TCP".to_string();
                info = "SSH connection attempt".to_string();
            } else if dst_port == "3389" {
                impact_score = 6.5;
                severity = "High".to_string();
                port = "3389".to_string();
                protocol_str = "TCP".to_string();
                info = "RDP connection attempt".to_string();
            } else if dst_port == "445" {
                impact_score = 9.0;
                severity = "Critical".to_string();
                port = "445".to_string();
                protocol_str = "TCP".to_string();
                info = "SMB connection attempt".to_string();
            }
        }
    }

    if impact_score > 0.0 {
        // Industry Standard CVSS severity mapping
        severity = if impact_score >= 9.0 {
            "Critical".to_string()
        } else if impact_score >= 7.0 {
            "High".to_string()
        } else if impact_score >= 4.0 {
            "Medium".to_string()
        } else {
            "Low".to_string()
        };

        let ts = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        
        let src_country = p.src_country.first().map(|s| s.as_str()).unwrap_or("");
        let dst_country = p.dst_country.first().map(|s| s.as_str()).unwrap_or("");

        if conn.execute(
            "INSERT INTO alerts (timestamp, impact_score, severity, port, protocol, info, payload, src_country, dst_country, src_ip) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![ts, impact_score, &severity, &port, &protocol_str, &info, payload, src_country, dst_country, src_ip],
        ).is_ok() {
            let uppercase_severity = severity.to_uppercase();
            let _ = log_audit_event(conn, "SYSTEM_EVENT", &uppercase_severity, "Intrusion Alert", &format!("IP: {}, Rule: {}", src_ip, info));
            
            let id = conn.last_insert_rowid();
            alert = Some(AlertData {
                id,
                timestamp: ts.clone(),
                impact_score,
                severity: severity.clone(),
                port: port.clone(),
                protocol: protocol_str.clone(),
                info: info.clone(),
                payload: payload.to_string(),
                src_country: src_country.to_string(),
                dst_country: dst_country.to_string(),
                src_ip: src_ip.to_string(),
                src_lat,
                src_lon,
                dst_lat,
                dst_lon,
            });
        }
    }

    Ok(alert)
}

pub fn insert_mock_alert(conn: &Connection, severity: &str, impact: f64, src_ip: &str) -> Result<AlertData> {
    use chrono::Local;
    let ts = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let port = "1337";
    let protocol = "TCP";
    let info = "Mock alert from Dev Tools";

    conn.execute(
        "INSERT INTO alerts (timestamp, impact_score, severity, port, protocol, info, src_ip) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![ts, impact, severity, port, protocol, info, src_ip],
    )?;

    let uppercase_severity = severity.to_uppercase();
    let _ = log_audit_event(conn, "SYSTEM_EVENT", &uppercase_severity, "Mock Intrusion Alert", &format!("IP: {}, Info: {}", src_ip, info));

    let id = conn.last_insert_rowid();
    Ok(AlertData {
        id,
        timestamp: ts,
        impact_score: impact,
        severity: severity.to_string(),
        port: port.to_string(),
        protocol: protocol.to_string(),
        info: info.to_string(),
        payload: String::new(),
        src_country: "MOCK".to_string(),
        dst_country: "MOCK".to_string(),
        src_ip: src_ip.to_string(),
        src_lat: Some(51.5074),
        src_lon: Some(-0.1278),
        dst_lat: Some(37.7749),
        dst_lon: Some(-122.4194),
    })
}

pub fn get_packets(conn: &Connection) -> Result<Vec<PacketData>> {
    let mut stmt = conn.prepare("SELECT frame_time, frame_len, ip_src, ip_dst, ip_proto, ip_ttl, tcp_srcport, tcp_dstport, tcp_flags, udp_srcport, udp_dstport, ws_col_info, eth_src, eth_dst, payload, src_country, dst_country FROM packets ORDER BY id DESC LIMIT 100")?;
    let packet_iter = stmt.query_map([], |row| {
        Ok(PacketData {
            frame_time: vec![row.get(0)?],
            frame_len: vec![row.get(1)?],
            ip_src: vec![row.get(2)?],
            ip_dst: vec![row.get(3)?],
            ip_proto: vec![row.get(4)?],
            ip_ttl: vec![row.get(5)?],
            tcp_srcport: vec![row.get(6)?],
            tcp_dstport: vec![row.get(7)?],
            tcp_flags: vec![row.get(8)?],
            udp_srcport: vec![row.get(9)?],
            udp_dstport: vec![row.get(10)?],
            _ws_col_info: vec![row.get(11)?],
            eth_src: vec![row.get(12)?],
            eth_dst: vec![row.get(13)?],
            payload: vec![row.get::<usize, Option<String>>(14)?.unwrap_or_default()],
            src_country: vec![row.get::<usize, Option<String>>(15)?.unwrap_or_default()],
            dst_country: vec![row.get::<usize, Option<String>>(16)?.unwrap_or_default()],
            src_lat: vec![],
            src_lon: vec![],
            dst_lat: vec![],
            dst_lon: vec![],
        })
    })?;

    let mut packets = Vec::new();
    for p in packet_iter {
        packets.push(p?);
    }
    Ok(packets)
}

pub fn get_alerts(conn: &Connection) -> Result<Vec<AlertData>> {
    let mut stmt = conn.prepare("SELECT id, timestamp, impact_score, severity, port, protocol, info, payload, src_country, dst_country, src_ip FROM alerts ORDER BY id DESC LIMIT 50")?;
    let alert_iter = stmt.query_map([], |row| {
        Ok(AlertData {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            impact_score: row.get(2)?,
            severity: row.get(3)?,
            port: row.get(4)?,
            protocol: row.get(5)?,
            info: row.get(6)?,
            payload: row.get::<usize, Option<String>>(7)?.unwrap_or_default(),
            src_country: row.get::<usize, Option<String>>(8)?.unwrap_or_default(),
            dst_country: row.get::<usize, Option<String>>(9)?.unwrap_or_default(),
            src_ip: row.get::<usize, Option<String>>(10)?.unwrap_or_default(),
            src_lat: None,
            src_lon: None,
            dst_lat: None,
            dst_lon: None,
        })
    })?;

    let mut alerts = Vec::new();
    for a in alert_iter {
        alerts.push(a?);
    }
    Ok(alerts)
}

pub fn get_blocked_ips(conn: &Connection) -> Result<Vec<BlockedIpData>> {
    let mut stmt = conn.prepare("SELECT id, ip, reason, timestamp FROM blocked_ips ORDER BY timestamp DESC")?;
    let ip_iter = stmt.query_map([], |row| {
        Ok(BlockedIpData {
            id: row.get(0)?,
            ip: row.get(1)?,
            reason: row.get(2)?,
            timestamp: row.get(3)?,
        })
    })?;

    let mut ips = Vec::new();
    for ip in ip_iter {
        ips.push(ip?);
    }
    Ok(ips)
}

pub fn insert_blocked_ip(conn: &Connection, ip: &str, reason: &str) -> Result<BlockedIpData> {
    let timestamp = Local::now().to_rfc3339();
    conn.execute(
        "INSERT OR IGNORE INTO blocked_ips (ip, reason, timestamp) VALUES (?1, ?2, ?3)",
        params![ip, reason, timestamp],
    )?;

    // We can't use last_insert_rowid reliably with INSERT OR IGNORE if it was ignored, 
    // so we fetch it back to get the real ID and Timestamp.
    let mut stmt = conn.prepare("SELECT id, ip, reason, timestamp FROM blocked_ips WHERE ip = ?1")?;
    let ip_data = stmt.query_row(params![ip], |row| {
        Ok(BlockedIpData {
            id: row.get(0)?,
            ip: row.get(1)?,
            reason: row.get(2)?,
            timestamp: row.get(3)?,
        })
    })?;

    Ok(ip_data)
}

pub fn remove_blocked_ip(conn: &Connection, ip: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM blocked_ips WHERE ip = ?1",
        params![ip],
    )?;
    Ok(())
}

pub fn get_whitelisted_ips(conn: &Connection) -> Result<Vec<WhitelistedIpData>> {
    let mut stmt = conn.prepare("SELECT id, ip, reason, timestamp FROM whitelisted_ips ORDER BY id DESC")?;
    let ip_iter = stmt.query_map([], |row| {
        Ok(WhitelistedIpData {
            id: row.get(0)?,
            ip: row.get(1)?,
            reason: row.get(2)?,
            timestamp: row.get(3)?,
        })
    })?;

    let mut ips = Vec::new();
    for ip in ip_iter {
        ips.push(ip?);
    }
    Ok(ips)
}

pub fn insert_whitelisted_ip(conn: &Connection, ip: &str, reason: &str) -> Result<()> {
    let timestamp = Local::now().to_rfc3339();
    conn.execute(
        "INSERT OR IGNORE INTO whitelisted_ips (ip, reason, timestamp) VALUES (?1, ?2, ?3)",
        params![ip, reason, timestamp],
    )?;
    Ok(())
}

pub fn remove_whitelisted_ip(conn: &Connection, ip: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM whitelisted_ips WHERE ip = ?1",
        params![ip],
    )?;
    Ok(())
}

pub fn get_telemetry_stats(conn: &Connection) -> Result<TelemetryStats> {
    let total_alerts: i64 = conn.query_row("SELECT count(*) FROM alerts", [], |row| row.get(0)).unwrap_or(0);
    // Simple 24h check: we store timestamp as YYYY-MM-DDTHH:MM:SS. SQLite date function:
    let last_24h = (chrono::Local::now() - chrono::Duration::days(1)).format("%Y-%m-%dT%H:%M:%S").to_string();
    let row_count = conn.query_row("SELECT COUNT(*) FROM alerts WHERE timestamp >= ?1", params![last_24h], |row| row.get(0))?;

    Ok(TelemetryStats {
        total_alerts,
        last_24h_alerts: row_count,
    })
}

pub fn insert_custom_rule(conn: &Connection, rule: &CustomRule) -> Result<i64> {
    conn.execute(
        "INSERT INTO custom_rules (name, description, action, src_ip, dst_ip, protocol, src_port, dst_port, direction, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            rule.name, rule.description, rule.action, rule.src_ip, rule.dst_ip,
            rule.protocol, rule.src_port, rule.dst_port, rule.direction, rule.is_active
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_custom_rules(conn: &Connection) -> Result<Vec<CustomRule>> {
    let mut stmt = conn.prepare("SELECT id, name, description, action, src_ip, dst_ip, protocol, src_port, dst_port, direction, is_active FROM custom_rules")?;
    let rule_iter = stmt.query_map([], |row| {
        Ok(CustomRule {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            description: row.get(2)?,
            action: row.get(3)?,
            src_ip: row.get(4)?,
            dst_ip: row.get(5)?,
            protocol: row.get(6)?,
            src_port: row.get(7)?,
            dst_port: row.get(8)?,
            direction: row.get(9)?,
            is_active: row.get(10)?,
        })
    })?;

    let mut rules = Vec::new();
    for rule in rule_iter {
        rules.push(rule?);
    }
    Ok(rules)
}

pub fn delete_custom_rule(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM custom_rules WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn toggle_custom_rule(conn: &Connection, id: i64, is_active: bool) -> Result<()> {
    conn.execute("UPDATE custom_rules SET is_active = ?1 WHERE id = ?2", params![is_active, id])?;
    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemHealthStats {
    pub database_size_bytes: u64,
    pub total_packets: i64,
    pub total_alerts: i64,
    pub is_capturing: bool,
}

pub fn get_system_health_stats(conn: &Connection, app_dir: std::path::PathBuf, is_capturing: bool) -> Result<SystemHealthStats> {
    let db_path = app_dir.join("guard_shield.db");
    let database_size_bytes = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
    
    let total_packets: i64 = conn.query_row("SELECT count(*) FROM packets", [], |row| row.get(0)).unwrap_or(0);
    let total_alerts: i64 = conn.query_row("SELECT count(*) FROM alerts", [], |row| row.get(0)).unwrap_or(0);
    
    Ok(SystemHealthStats {
        database_size_bytes,
        total_packets,
        total_alerts,
        is_capturing,
    })
}

pub fn clear_database(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM packets", [])?;
    conn.execute("DELETE FROM alerts", [])?;
    conn.execute("VACUUM", [])?;
    Ok(())
}

pub fn log_audit_event(conn: &Connection, log_type: &str, severity: &str, action: &str, details: &str) -> Result<()> {
    let timestamp = Local::now().to_rfc3339();
    conn.execute(
        "INSERT INTO audit_logs (timestamp, log_type, severity, action, details) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![timestamp, log_type, severity, action, details],
    )?;
    Ok(())
}

pub fn get_audit_logs(
    conn: &Connection, 
    log_type_filter: Option<String>, 
    limit: i64,
    offset: i64,
    start_date: Option<String>,
    end_date: Option<String>,
    category: Option<String>
) -> Result<Vec<AuditLog>> {
    let mut query = "SELECT id, timestamp, log_type, severity, action, details FROM audit_logs WHERE 1=1".to_string();
    
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
    
    if let Some(log_type) = &log_type_filter {
        query.push_str(&format!(" AND log_type = ?{}", params.len() + 1));
        params.push(log_type);
    }
    
    if let Some(start) = &start_date {
        query.push_str(&format!(" AND timestamp >= ?{}", params.len() + 1));
        params.push(start);
    }
    
    if let Some(end) = &end_date {
        query.push_str(&format!(" AND timestamp <= ?{}", params.len() + 1));
        params.push(end);
    }
    
    if let Some(cat) = &category {
        if cat == "Engine Actions" {
            query.push_str(" AND (action LIKE '%Start%' OR action LIKE '%Stop%' OR action LIKE '%Fail%')");
        } else if cat == "Intrusion Alerts" {
            query.push_str(" AND action LIKE '%Intrusion Alert%'");
        }
    }
    
    query.push_str(&format!(" ORDER BY id DESC LIMIT ?{} OFFSET ?{}", params.len() + 1, params.len() + 2));
    params.push(&limit);
    params.push(&offset);

    let mut stmt = conn.prepare(&query)?;
    
    let rows = stmt.query_map(rusqlite::params_from_iter(params.into_iter()), |row| {
        Ok(AuditLog {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            log_type: row.get(2)?,
            severity: row.get(3)?,
            action: row.get(4)?,
            details: row.get(5).unwrap_or_default(),
        })
    })?;

    let mut logs = Vec::new();
    for log in rows {
        logs.push(log?);
    }
    
    Ok(logs)
}

pub fn clear_audit_logs(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM audit_logs", [])?;
    Ok(())
}

pub fn save_threat_indicators(conn: &mut Connection, indicators: &[crate::threat_feed::ThreatIndicator]) -> Result<()> {
    let tx = conn.transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT OR IGNORE INTO threat_intelligence (id, indicator, type, provider, category, confidence, date_added)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        )?;
        for ind in indicators {
            stmt.execute(params![
                ind.id,
                ind.indicator,
                ind.r#type,
                ind.provider,
                ind.category,
                ind.confidence,
                ind.date_added
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn get_all_threat_indicators(conn: &Connection) -> Result<Vec<crate::threat_feed::ThreatIndicator>> {
    let mut stmt = conn.prepare("SELECT id, indicator, type, provider, category, confidence, date_added FROM threat_intelligence")?;
    let rows = stmt.query_map([], |row| {
        Ok(crate::threat_feed::ThreatIndicator {
            id: row.get(0)?,
            indicator: row.get(1)?,
            r#type: row.get(2)?,
            provider: row.get(3)?,
            category: row.get(4)?,
            confidence: row.get(5)?,
            date_added: row.get(6)?,
        })
    })?;

    let mut inds = Vec::new();
    for row in rows {
        inds.push(row?);
    }
    Ok(inds)
}
