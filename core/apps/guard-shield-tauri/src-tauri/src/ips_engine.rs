use std::sync::{Arc, atomic::{AtomicBool, AtomicUsize, Ordering}};
use windivert::{WinDivert, prelude::WinDivertFlags};

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

    pub fn start(&mut self, blocked_ips: Vec<String>) -> Result<(), String> {
        self.stop();

        self.current_ips = blocked_ips.clone();

        if blocked_ips.is_empty() {
            return Ok(());
        }

        let is_running = Arc::new(AtomicBool::new(true));
        self.is_running = is_running.clone();
        let dropped_count = self.dropped_count.clone();

        // Build the WinDivert filter string
        let mut filters = Vec::new();
        for ip in blocked_ips {
            filters.push(format!("(ip.SrcAddr == {} or ip.DstAddr == {})", ip, ip));
        }
        let filter_str = filters.join(" or ");

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
