use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Instant, Duration};

const ANOMALY_THRESHOLD: usize = 100; // packets per window
const TIME_WINDOW: Duration = Duration::from_secs(10); // 10 seconds

struct IpStats {
    count: usize,
    first_seen: Instant,
}

pub struct BehavioralHeuristicsEngine {
    ip_tracker: Arc<Mutex<HashMap<String, IpStats>>>,
}

impl BehavioralHeuristicsEngine {
    pub fn new() -> Self {
        Self {
            ip_tracker: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Evaluates a packet from an IP. Returns `true` if it's considered anomalous (e.g. potential DoS/Scan).
    pub fn evaluate(&self, src_ip: &str) -> bool {
        if src_ip.is_empty() || src_ip == "Local Network" || src_ip == "127.0.0.1" || src_ip == "::1" {
            return false;
        }

        let mut tracker = self.ip_tracker.lock().unwrap();
        let now = Instant::now();

        // Cleanup old entries periodically (could be optimized, but works for simple engine)
        tracker.retain(|_, stats| now.duration_since(stats.first_seen) < TIME_WINDOW * 2);

        let entry = tracker.entry(src_ip.to_string()).or_insert(IpStats {
            count: 0,
            first_seen: now,
        });

        if now.duration_since(entry.first_seen) > TIME_WINDOW {
            // Reset window
            entry.count = 1;
            entry.first_seen = now;
            return false;
        }

        entry.count += 1;

        if entry.count > ANOMALY_THRESHOLD {
            // Prevent spamming anomalies by resetting count slightly so it takes a bit to trigger again
            entry.count = 0;
            entry.first_seen = now;
            return true;
        }

        false
    }
}
