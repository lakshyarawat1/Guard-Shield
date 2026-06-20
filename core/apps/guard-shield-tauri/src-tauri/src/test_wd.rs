use windivert::{WinDivert, prelude::WinDivertFlags};

fn main() {
    let wd = WinDivert::network("ip.DstAddr == 1.1.1.1", 0, WinDivertFlags::new()).unwrap();
    let mut buf = vec![0u8; 65535];
    match wd.recv(Some(&mut buf)) {
        Ok(_) => println!("OK"),
        Err(e) => println!("ERR: {:?}", e),
    }
}
