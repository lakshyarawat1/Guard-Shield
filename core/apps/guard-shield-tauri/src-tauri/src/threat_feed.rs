use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThreatIndicator {
    pub id: String,
    pub indicator: String,
    pub r#type: String, // "IP"
    pub provider: String,
    pub category: String,
    pub confidence: String,
    #[serde(rename = "dateAdded")]
    pub date_added: String,
}

pub async fn fetch_cins_army() -> Result<Vec<ThreatIndicator>, String> {
    // 🛡️ Sentinel: Use HTTPS to prevent MITM attacks tampering with the threat feed.
    let url = "https://cinsscore.com/list/ci-badguys.txt";
    let resp = reqwest::get(url).await.map_err(|e| e.to_string())?;
    let text = resp.text().await.map_err(|e| e.to_string())?;
    
    let mut indicators = Vec::new();
    let ts = Local::now().format("%Y-%m-%dT%H:%M:%S%z").to_string();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        
        // Simple IP validation
        if line.parse::<std::net::IpAddr>().is_ok() {
            indicators.push(ThreatIndicator {
                id: format!("CINS-{}", line),
                indicator: line.to_string(),
                r#type: "IP".to_string(),
                provider: "CINS Army".to_string(),
                category: "Malicious Host".to_string(),
                confidence: "High".to_string(),
                date_added: ts.clone(),
            });
        }
    }

    Ok(indicators)
}

pub async fn fetch_emerging_threats() -> Result<Vec<ThreatIndicator>, String> {
    let url = "https://rules.emergingthreats.net/fwrules/emerging-Block-IPs.txt";
    let resp = reqwest::get(url).await.map_err(|e| e.to_string())?;
    let text = resp.text().await.map_err(|e| e.to_string())?;
    
    let mut indicators = Vec::new();
    let ts = Local::now().format("%Y-%m-%dT%H:%M:%S%z").to_string();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        
        if line.parse::<std::net::IpAddr>().is_ok() {
            indicators.push(ThreatIndicator {
                id: format!("ET-{}", line),
                indicator: line.to_string(),
                r#type: "IP".to_string(),
                provider: "Emerging Threats".to_string(),
                category: "Compromised Node".to_string(),
                confidence: "High".to_string(),
                date_added: ts.clone(),
            });
        }
    }

    Ok(indicators)
}

pub async fn sync_all_feeds() -> Result<Vec<ThreatIndicator>, String> {
    let mut all_indicators = Vec::new();
    
    // Fetch multiple sources concurrently
    let (cins_res, et_res) = tokio::join!(
        fetch_cins_army(),
        fetch_emerging_threats()
    );

    if let Ok(mut cins) = cins_res {
        all_indicators.append(&mut cins);
    }
    if let Ok(mut et) = et_res {
        all_indicators.append(&mut et);
    }
    
    // Deduplicate by IP
    let mut seen = HashSet::new();
    all_indicators.retain(|i| seen.insert(i.indicator.clone()));
    
    Ok(all_indicators)
}
