use std::sync::{Arc, atomic::{AtomicBool, AtomicUsize, Ordering}};
use windivert::{WinDivert, prelude::WinDivertFlags};
use crate::database::CustomRule;

pub struct IpsEngine {
    is_running: Arc<AtomicBool>,
    dropped_count: Arc<AtomicUsize>,
    current_ips: Vec<String>,
}

impl IpsEngine {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            dropped_count: Arc::new(AtomicUsize::new(0)),
            current_ips: Vec::new(),
        }
    }

    pub fn get_dropped_count(&self) -> usize {
        self.dropped_count.load(Ordering::Relaxed)
    }

    pub fn start(&mut self, blocked_ips: Vec<String>, drop_rules: Vec<CustomRule>, whitelisted_ips: Vec<String>) -> Result<(), String> {
        self.stop();

        self.current_ips = blocked_ips.clone();

        if blocked_ips.is_empty() && drop_rules.is_empty() {
            return Ok(());
        }

        let is_running = Arc::new(AtomicBool::new(true));
        self.is_running = is_running.clone();
        let dropped_count = self.dropped_count.clone();

        // Build the WinDivert filter string
        let mut filters = Vec::new();
        
        // 1. IP Auto-blocks
        for ip in blocked_ips {
            filters.push(format!("(ip.SrcAddr == {} or ip.DstAddr == {})", ip, ip));
        }

        // 2. Custom Drop Rules
        for rule in drop_rules {
            if !rule.is_active || rule.action != "Drop" {
                continue;
            }

            let mut rule_filters = Vec::new();
            
            // Protocol matching
            if rule.protocol != "Any" {
                rule_filters.push(rule.protocol.to_lowercase());
            }

            // IP matching
            if let Some(src) = &rule.src_ip {
                if !src.is_empty() {
                    rule_filters.push(format!("ip.SrcAddr == {}", src));
                }
            }
            if let Some(dst) = &rule.dst_ip {
                if !dst.is_empty() {
                    rule_filters.push(format!("ip.DstAddr == {}", dst));
                }
            }

            // Port matching (requires tcp or udp in the rule filter)
            if let Some(src_port) = &rule.src_port {
                if !src_port.is_empty() {
                    if rule.protocol == "TCP" {
                        rule_filters.push(format!("tcp.SrcPort == {}", src_port));
                    } else if rule.protocol == "UDP" {
                        rule_filters.push(format!("udp.SrcPort == {}", src_port));
                    } else if rule.protocol == "Any" {
                        // If protocol is Any, but port is specified, WinDivert needs us to specify it's a TCP or UDP packet.
                        rule_filters.push(format!("((tcp and tcp.SrcPort == {}) or (udp and udp.SrcPort == {}))", src_port, src_port));
                    }
                }
            }
            
            if let Some(dst_port) = &rule.dst_port {
                if !dst_port.is_empty() {
                    if rule.protocol == "TCP" {
                        rule_filters.push(format!("tcp.DstPort == {}", dst_port));
                    } else if rule.protocol == "UDP" {
                        rule_filters.push(format!("udp.DstPort == {}", dst_port));
                    } else if rule.protocol == "Any" {
                        rule_filters.push(format!("((tcp and tcp.DstPort == {}) or (udp and udp.DstPort == {}))", dst_port, dst_port));
                    }
                }
            }

            if !rule_filters.is_empty() {
                filters.push(format!("({})", rule_filters.join(" and ")));
            }
        }

        let mut filter_str = if filters.is_empty() {
            // Technically it's impossible to reach here without is_empty check above unless all rules are inactive/alert, but just in case.
            // If filters are empty but engine started, we should probably just return Ok(()) and not drop anything.
            return Ok(());
        } else {
            filters.join(" or ")
        };

        // 3. Apply Global Whitelist Exceptions
        if !whitelisted_ips.is_empty() {
            let mut whitelist_filters = Vec::new();
            for w_ip in whitelisted_ips {
                whitelist_filters.push(format!("(ip.SrcAddr == '{}' or ip.DstAddr == '{}')", w_ip, w_ip));
            }
            let whitelist_str = whitelist_filters.join(" or ");
            filter_str = format!("({}) and !({})", filter_str, whitelist_str);
        }

        std::thread::spawn(move || {
            match WinDivert::network(&filter_str, 0, WinDivertFlags::new()) {
                Ok(mut wd) => {
                    let mut buf = vec![0u8; 65535];
                    loop {
                        if !is_running.load(Ordering::Relaxed) {
                            break;
                        }
                        match wd.recv(Some(&mut buf)) {
                            Ok(_) => {
                                if !is_running.load(Ordering::Relaxed) {
                                    break;
                                }
                                dropped_count.fetch_add(1, Ordering::Relaxed);
                            }
                            Err(e) => {
                                if !is_running.load(Ordering::Relaxed) {
                                    break;
                                }
                                eprintln!("WinDivert recv error: {:?}", e);
                                dropped_count.fetch_add(1, Ordering::Relaxed);
                            }
                        }
                    }
                    let _ = wd.close(Default::default());
                }
                Err(e) => {
                    eprintln!("Failed to open WinDivert (Ensure running as Administrator): {:?}", e);
                }
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        self.is_running.store(false, Ordering::Relaxed);
        
        // Send a dummy UDP packet to each blocked IP to wake up the blocking wd.recv() call!
        if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
            for ip in &self.current_ips {
                let addr = format!("{}:80", ip);
                let _ = socket.send_to(b"wake", addr);
            }
        }
    }
}
