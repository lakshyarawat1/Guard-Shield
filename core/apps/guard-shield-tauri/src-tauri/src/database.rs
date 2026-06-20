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
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BlockedIpData {
    pub id: i64,
    pub ip: String,
    pub reason: String,
    pub timestamp: String,
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
            is_active BOOLEAN NOT NULL DEFAULT 1
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS blocked_ips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT UNIQUE NOT NULL,
            reason TEXT,
            timestamp TEXT NOT NULL
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

    // ⚡ Bolt Optimization: Add index to speed up `get_telemetry_stats` range query on `timestamp`.
    // Turns O(N) full table scan into an O(log N) index lookup.
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp)", []);

    Ok(DatabaseState { conn: Mutex::new(conn) })
}

pub fn insert_packet(conn: &Connection, p: &PacketData, counter: &mut u64, custom_rules: &[CustomRule]) -> Result<Option<AlertData>> {
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
    if *counter % 500 == 0 {
        let _ = conn.execute("DELETE FROM packets WHERE id NOT IN (SELECT id FROM packets ORDER BY id DESC LIMIT 10000)", []);
    }

    let mut alert = None;
    let proto = p.ip_proto.first().map(|s| s.as_str()).unwrap_or("");
    let mut impact_score = 0.0;
    let mut severity = "";
    let mut port = "";
    let mut protocol_str = "";
    let mut info = "";

    let src_ip = p.ip_src.first().map(|s| s.as_str()).unwrap_or("");
    let dst_ip = p.ip_dst.first().map(|s| s.as_str()).unwrap_or("");
    
    let default_empty = String::new();
    let src_port_ref = p.tcp_srcport.first().unwrap_or_else(|| p.udp_srcport.first().unwrap_or(&default_empty));
    let dst_port_ref = p.tcp_dstport.first().unwrap_or_else(|| p.udp_dstport.first().unwrap_or(&default_empty));
    
    let src_port = src_port_ref.as_str();
    let dst_port = dst_port_ref.as_str();

    let proto_name = if proto == "6" { "TCP" } else if proto == "17" { "UDP" } else if proto == "1" { "ICMP" } else { "Any" };

    // 1. Evaluate Custom Rules first
    for rule in custom_rules {
        if !rule.is_active { continue; }
        
        let proto_match = rule.protocol == "Any" || rule.protocol == proto_name;
        let src_ip_match = rule.src_ip.as_deref().unwrap_or("") == "" || rule.src_ip.as_deref().unwrap_or("") == src_ip;
        let dst_ip_match = rule.dst_ip.as_deref().unwrap_or("") == "" || rule.dst_ip.as_deref().unwrap_or("") == dst_ip;
        let src_port_match = rule.src_port.as_deref().unwrap_or("") == "" || rule.src_port.as_deref().unwrap_or("") == src_port;
        let dst_port_match = rule.dst_port.as_deref().unwrap_or("") == "" || rule.dst_port.as_deref().unwrap_or("") == dst_port;

        if proto_match && src_ip_match && dst_ip_match && src_port_match && dst_port_match {
            impact_score = 10.0; // Custom rules are high priority
            severity = "Critical";
            port = dst_port;
            protocol_str = proto_name;
            info = rule.name.as_str();
            break; // Stop evaluating after first custom rule match
        }
    }

    // 2. Evaluate Deep Packet Inspection (DPI) Signatures
    if impact_score == 0.0 && !payload.is_empty() {
        let payload_lower = payload.to_lowercase();
        
        // SQL Injection (SQLi)
        if payload_lower.contains("union select") || 
           payload_lower.contains("select * from") || 
           payload_lower.contains("drop table") || 
           payload_lower.contains("1=1") || 
           payload_lower.contains("or 1=1") || 
           payload_lower.contains("or '1'='1'") {
            impact_score = 10.0;
            severity = "Critical";
            port = dst_port;
            protocol_str = proto_name;
            info = "SQL Injection (SQLi) Payload Detected";
        }
        // Cross-Site Scripting (XSS)
        else if payload_lower.contains("<script>") || 
                payload_lower.contains("javascript:") || 
                payload_lower.contains("onerror=") || 
                payload_lower.contains("onload=") {
            impact_score = 8.5;
            severity = "High";
            port = dst_port;
            protocol_str = proto_name;
            info = "Cross-Site Scripting (XSS) Payload Detected";
        }
        // Path Traversal
        else if payload_lower.contains("../../") || 
                payload_lower.contains("..\\..\\") || 
                payload_lower.contains("%2e%2e%2f") {
            impact_score = 8.0;
            severity = "High";
            port = dst_port;
            protocol_str = proto_name;
            info = "Directory Traversal Payload Detected";
        }
        // Command Injection
        else if payload_lower.contains("/bin/bash") || 
                payload_lower.contains("/bin/sh") || 
                payload_lower.contains("cmd.exe") || 
                payload_lower.contains("powershell.exe -e") {
            impact_score = 10.0;
            severity = "Critical";
            port = dst_port;
            protocol_str = proto_name;
            info = "OS Command Injection Payload Detected";
        }
    }

    // 3. Evaluate Hardcoded Rules only if no custom rule or DPI matched
    if impact_score == 0.0 {
        if proto == "1" { 
            impact_score = 2.0;
            severity = "Low";
            port = "N/A";
            protocol_str = "ICMP";
            info = "Possible ICMP Ping";
        } else if proto == "6" { 
            let dst_port = p.tcp_dstport.first().map(|s| s.as_str()).unwrap_or("");
            if dst_port == "23" {
                impact_score = 8.5;
                severity = "High";
                port = "23";
                protocol_str = "TCP";
                info = "Telnet connection attempt (insecure)";
            } else if dst_port == "22" {
                impact_score = 4.0;
                severity = "Medium";
                port = "22";
                protocol_str = "TCP";
                info = "SSH connection attempt";
            } else if dst_port == "3389" {
                impact_score = 6.5;
                severity = "High";
                port = "3389";
                protocol_str = "TCP";
                info = "RDP connection attempt";
            } else if dst_port == "445" {
                impact_score = 9.0;
                severity = "Critical";
                port = "445";
                protocol_str = "TCP";
                info = "SMB connection attempt";
            }
        }
    }

    if impact_score > 0.0 {
        let ts = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        
        let src_country = p.src_country.first().map(|s| s.as_str()).unwrap_or("");
        let dst_country = p.dst_country.first().map(|s| s.as_str()).unwrap_or("");

        if let Ok(_) = conn.execute(
            "INSERT INTO alerts (timestamp, impact_score, severity, port, protocol, info, payload, src_country, dst_country, src_ip) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![ts, impact_score, severity, port, protocol_str, info, payload, src_country, dst_country, src_ip],
        ) {
            let id = conn.last_insert_rowid();
            alert = Some(AlertData {
                id,
                timestamp: ts,
                impact_score,
                severity: severity.to_string(),
                port: port.to_string(),
                protocol: protocol_str.to_string(),
                info: info.to_string(),
                payload: payload.to_string(),
                src_country: src_country.to_string(),
                dst_country: dst_country.to_string(),
                src_ip: src_ip.to_string(),
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
        src_country: String::new(),
        dst_country: String::new(),
        src_ip: src_ip.to_string(),
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
        "INSERT INTO custom_rules (name, description, action, src_ip, dst_ip, protocol, src_port, dst_port, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            rule.name,
            rule.description,
            rule.action,
            rule.src_ip,
            rule.dst_ip,
            rule.protocol,
            rule.src_port,
            rule.dst_port,
            rule.is_active
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_custom_rules(conn: &Connection) -> Result<Vec<CustomRule>> {
    let mut stmt = conn.prepare("SELECT id, name, description, action, src_ip, dst_ip, protocol, src_port, dst_port, is_active FROM custom_rules")?;
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
            is_active: row.get(9)?,
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

