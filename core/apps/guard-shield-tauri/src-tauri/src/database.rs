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

    Ok(DatabaseState { conn: Mutex::new(conn) })
}

pub fn insert_packet(conn: &Connection, p: &PacketData, counter: &mut u64) -> Result<Option<AlertData>> {
    conn.execute(
        "INSERT INTO packets (
            frame_time, frame_len, ip_src, ip_dst, ip_proto, ip_ttl, 
            tcp_srcport, tcp_dstport, tcp_flags, udp_srcport, udp_dstport, ws_col_info, eth_src, eth_dst
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
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

    if impact_score > 0.0 {
        let ts = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        if let Ok(_) = conn.execute(
            "INSERT INTO alerts (timestamp, impact_score, severity, port, protocol, info) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![ts, impact_score, severity, port, protocol_str, info],
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
            });
        }
    }

    Ok(alert)
}

pub fn insert_mock_alert(conn: &Connection, severity: &str, impact: f64) -> Result<AlertData> {
    use chrono::Local;
    let ts = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let port = "1337";
    let protocol = "TCP";
    let info = "Mock alert from Dev Tools";

    conn.execute(
        "INSERT INTO alerts (timestamp, impact_score, severity, port, protocol, info) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![ts, impact, severity, port, protocol, info],
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
    })
}

pub fn get_packets(conn: &Connection) -> Result<Vec<PacketData>> {
    let mut stmt = conn.prepare("SELECT frame_time, frame_len, ip_src, ip_dst, ip_proto, ip_ttl, tcp_srcport, tcp_dstport, tcp_flags, udp_srcport, udp_dstport, ws_col_info, eth_src, eth_dst FROM packets ORDER BY id DESC LIMIT 100")?;
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
        })
    })?;

    let mut packets = Vec::new();
    for p in packet_iter {
        packets.push(p?);
    }
    Ok(packets)
}

pub fn get_alerts(conn: &Connection) -> Result<Vec<AlertData>> {
    let mut stmt = conn.prepare("SELECT id, timestamp, impact_score, severity, port, protocol, info FROM alerts ORDER BY id DESC LIMIT 100")?;
    let alert_iter = stmt.query_map([], |row| {
        Ok(AlertData {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            impact_score: row.get(2)?,
            severity: row.get(3)?,
            port: row.get(4)?,
            protocol: row.get(5)?,
            info: row.get(6)?,
        })
    })?;

    let mut alerts = Vec::new();
    for a in alert_iter {
        alerts.push(a?);
    }
    Ok(alerts)
}

pub fn get_telemetry_stats(conn: &Connection) -> Result<TelemetryStats> {
    let total_alerts: i64 = conn.query_row("SELECT count(*) FROM alerts", [], |row| row.get(0)).unwrap_or(0);
    // Simple 24h check: we store timestamp as YYYY-MM-DDTHH:MM:SS. SQLite date function:
    let last_24h_alerts: i64 = conn.query_row(
        "SELECT count(*) FROM alerts WHERE datetime(timestamp) >= datetime('now', '-1 day')", 
        [], 
        |row| row.get(0)
    ).unwrap_or(0);

    Ok(TelemetryStats {
        total_alerts,
        last_24h_alerts,
    })
}
