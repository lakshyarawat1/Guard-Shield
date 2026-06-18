use chrono::Local;
use crossbeam_channel::Sender;
use serde::{Deserialize, Serialize};
use socket2::{Domain, Protocol, Socket, Type};
use std::ffi::c_void;
use std::mem::MaybeUninit;
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4};
use std::os::windows::io::AsRawSocket;
use std::sync::{Arc, atomic::AtomicBool};
use windows_sys::Win32::Networking::WinSock::{WSAIoctl, SIO_RCVALL, SOCKET};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PacketData {
    pub frame_time: Vec<String>,
    pub frame_len: Vec<String>,
    pub ip_src: Vec<String>,
    pub ip_dst: Vec<String>,
    pub ip_proto: Vec<String>,
    pub ip_ttl: Vec<String>,
    pub tcp_srcport: Vec<String>,
    pub tcp_dstport: Vec<String>,
    pub tcp_flags: Vec<String>,
    pub udp_srcport: Vec<String>,
    pub udp_dstport: Vec<String>,
    pub _ws_col_info: Vec<String>,
    pub eth_src: Vec<String>,
    pub eth_dst: Vec<String>,
    pub payload: Vec<String>,
    pub src_country: Vec<String>,
    pub dst_country: Vec<String>,
}

pub fn get_interfaces() -> Vec<String> {
    if let Ok(interfaces) = get_if_addrs::get_if_addrs() {
        interfaces
            .into_iter()
            .filter(|iface| iface.ip().is_ipv4() && !iface.ip().is_loopback())
            .map(|iface| iface.ip().to_string())
            .collect()
    } else {
        vec!["127.0.0.1".to_string()]
    }
}

fn get_service(port: u16) -> &'static str {
    match port {
        20 | 21 => "FTP",
        22 => "SSH",
        23 => "Telnet",
        25 => "SMTP",
        53 => "DNS",
        67 | 68 => "DHCP",
        80 => "HTTP",
        110 => "POP3",
        123 => "NTP",
        143 => "IMAP",
        443 => "HTTPS",
        445 => "SMB",
        1900 => "SSDP",
        3306 => "MySQL",
        3389 => "RDP",
        5353 => "mDNS",
        5432 => "PostgreSQL",
        8080 => "HTTP-Alt",
        _ => "",
    }
}

fn format_flags(flags: u16) -> String {
    let mut f = Vec::new();
    if flags & 0x01 != 0 { f.push("FIN"); }
    if flags & 0x02 != 0 { f.push("SYN"); }
    if flags & 0x04 != 0 { f.push("RST"); }
    if flags & 0x08 != 0 { f.push("PSH"); }
    if flags & 0x10 != 0 { f.push("ACK"); }
    if flags & 0x20 != 0 { f.push("URG"); }
    if f.is_empty() {
        return format!("0x{:03x}", flags);
    }
    format!("{} (0x{:03x})", f.join(","), flags)
}

pub fn start_capture(interface_ip: String, _bpf_filter: String, sender: Sender<PacketData>, run_flag: Arc<AtomicBool>) -> Result<(), String> {
    let ip: Ipv4Addr = interface_ip.parse().map_err(|_| format!("Invalid interface IP: {}", interface_ip))?;

    // Create raw socket
    let socket = Socket::new(Domain::IPV4, Type::RAW, Some(Protocol::from(0)))
        .map_err(|e| format!("Failed to create raw socket (Administrator privileges required): {}", e))?;

    // Bind to the interface IP
    let addr = SocketAddrV4::new(ip, 0);
    socket.bind(&SocketAddr::V4(addr).into())
        .map_err(|e| format!("Failed to bind to {}: {}", ip, e))?;

    // Set SIO_RCVALL
    let raw_socket = socket.as_raw_socket() as SOCKET;
    let mut bytes_returned: u32 = 0;
    let optval: u32 = 1; // RCVALL_ON

    unsafe {
        let res = WSAIoctl(
            raw_socket,
            SIO_RCVALL,
            &optval as *const u32 as *const c_void,
            std::mem::size_of::<u32>() as u32,
            std::ptr::null_mut(),
            0,
            &mut bytes_returned,
            std::ptr::null_mut(),
            None,
        );
        if res != 0 {
            let err = std::io::Error::last_os_error();
            return Err(format!("WSAIoctl SIO_RCVALL failed: {}. Admin privileges are usually required.", err));
        }
    }

    // Set a timeout so we can periodically check the run_flag
    socket.set_read_timeout(Some(std::time::Duration::from_millis(500)))
        .map_err(|e| format!("Failed to set read timeout: {}", e))?;

    std::thread::spawn(move || {
        let mut buf = [MaybeUninit::uninit(); 65535];
        let filter_lower = _bpf_filter.to_lowercase();
        let is_empty_filter = filter_lower.is_empty();

        loop {
            if !run_flag.load(std::sync::atomic::Ordering::Relaxed) {
                break;
            }

            match socket.recv(&mut buf) {
                Ok(len) if len > 0 => {
                    let mut packet = vec![0u8; len];
                    for i in 0..len {
                        unsafe {
                            packet[i] = buf[i].assume_init();
                        }
                    }

                    let frame_len = len.to_string();
                    let frame_time = Local::now().format("%b %d, %Y %H:%M:%S.%3f").to_string();

                    // Parse IPv4 header
                    if packet.len() >= 20 {
                        let ihl = (packet[0] & 0x0F) * 4;
                        let ttl = packet[8];
                        let protocol = packet[9];
                        let src_ip = Ipv4Addr::new(packet[12], packet[13], packet[14], packet[15]);
                        let dst_ip = Ipv4Addr::new(packet[16], packet[17], packet[18], packet[19]);

                        let mut pass_filter = is_empty_filter;
                        let mut p_data = PacketData {
                            frame_time: vec![frame_time],
                            frame_len: vec![frame_len],
                            ip_src: vec![src_ip.to_string()],
                            ip_dst: vec![dst_ip.to_string()],
                            ip_proto: vec![protocol.to_string()],
                            ip_ttl: vec![ttl.to_string()],
                            tcp_srcport: vec!["".to_string()], // Initialized empty so UI doesn't show "0"
                            tcp_dstport: vec!["".to_string()],
                            tcp_flags: vec!["".to_string()],
                            udp_srcport: vec!["".to_string()],
                            udp_dstport: vec!["".to_string()],
                            _ws_col_info: vec![format!("Proto {}", protocol)],
                            eth_src: vec!["N/A (Raw Socket)".to_string()],
                            eth_dst: vec!["N/A (Raw Socket)".to_string()],
                            payload: vec![hex::encode(&packet)],
                            src_country: vec![],
                            dst_country: vec![],
                        };

                        if packet.len() >= ihl as usize {
                            let payload = &packet[ihl as usize..];
                            match protocol {
                                6 => {
                                    // TCP
                                    if !is_empty_filter && filter_lower.contains("tcp") {
                                        pass_filter = true;
                                    }
                                    if payload.len() >= 20 {
                                        let src_port = u16::from_be_bytes([payload[0], payload[1]]);
                                        let dst_port = u16::from_be_bytes([payload[2], payload[3]]);
                                        let flags =
                                            u16::from_be_bytes([payload[12], payload[13]]) & 0x01FF;

                                        p_data.tcp_srcport = vec![src_port.to_string()];
                                        p_data.tcp_dstport = vec![dst_port.to_string()];
                                        p_data.tcp_flags = vec![format_flags(flags)];
                                        
                                        let srv_src = get_service(src_port);
                                        let srv_dst = get_service(dst_port);
                                        let srv = if !srv_dst.is_empty() { srv_dst } else if !srv_src.is_empty() { srv_src } else { "" };
                                        
                                        let info = if srv.is_empty() {
                                            format!("TCP {} -> {} [{}] Seq=...", src_port, dst_port, p_data.tcp_flags[0])
                                        } else {
                                            format!("{} (TCP {} -> {}) [{}]", srv, src_port, dst_port, p_data.tcp_flags[0])
                                        };
                                        p_data._ws_col_info = vec![info];
                                    }
                                }
                                17 => {
                                    // UDP
                                    if !is_empty_filter && filter_lower.contains("udp") {
                                        pass_filter = true;
                                    }
                                    if payload.len() >= 8 {
                                        let src_port = u16::from_be_bytes([payload[0], payload[1]]);
                                        let dst_port = u16::from_be_bytes([payload[2], payload[3]]);

                                        p_data.udp_srcport = vec![src_port.to_string()];
                                        p_data.udp_dstport = vec![dst_port.to_string()];
                                        
                                        let srv_src = get_service(src_port);
                                        let srv_dst = get_service(dst_port);
                                        let srv = if !srv_dst.is_empty() { srv_dst } else if !srv_src.is_empty() { srv_src } else { "" };
                                        
                                        let info = if srv.is_empty() {
                                            format!("UDP {} -> {} Len={}", src_port, dst_port, payload.len() - 8)
                                        } else {
                                            format!("{} (UDP {} -> {})", srv, src_port, dst_port)
                                        };
                                        p_data._ws_col_info = vec![info];
                                    }
                                }
                                1 => {
                                    // ICMP
                                    if !is_empty_filter && filter_lower.contains("icmp") {
                                        pass_filter = true;
                                    }
                                    if payload.len() >= 2 {
                                        let icmp_type = payload[0];
                                        let icmp_code = payload[1];
                                        let type_str = match icmp_type {
                                            0 => "Echo Reply",
                                            3 => "Destination Unreachable",
                                            5 => "Redirect",
                                            8 => "Echo Request",
                                            11 => "Time Exceeded",
                                            _ => "Unknown",
                                        };
                                        p_data._ws_col_info = vec![format!("ICMP {} (Type: {}, Code: {})", type_str, icmp_type, icmp_code)];
                                    } else {
                                        p_data._ws_col_info = vec!["ICMP packet".to_string()];
                                    }
                                }
                                _ => {
                                    if is_empty_filter {
                                        pass_filter = true;
                                    }
                                }
                            }
                        }

                        if pass_filter {
                            if sender.send(p_data).is_err() {
                                break;
                            }
                        }
                    }
                }
                Ok(_) => continue,
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock || e.kind() == std::io::ErrorKind::TimedOut => {
                    continue; // Timeout hit, loop around to check run_flag
                }
                Err(e) => {
                    eprintln!("Socket receive error: {}", e);
                    break;
                }
            }
        }
    });

    Ok(())
}
