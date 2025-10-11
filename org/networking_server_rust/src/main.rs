use pcap::{Device, Capture};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let device = Device::lookup()?.expect("No device found!");
    println!("Using device: {}", device.name);

    let mut cap= Capture::from_device(device)?
        .promisc(true)
        .snaplen(65535)
        .timeout(1000)
        .open()?;

    println!("Listening for packets... Press Ctrl+C to stop.");

    loop{
        match cap.next_packet(){
            Ok(packet) => {
                println!("Captured packet : ");
                println!("  Length: {} bytes", packet.header.len);
                println!("  Timestamp: {}.{} seconds", packet.header.ts.tv_sec, packet.header.ts.tv_usec);
                println!("  Data: (first 64 bytes): {:02x?}\n", &packet.data[..packet.data.len().min(64)]);
            }
            Err(e) => {
                eprintln!("Error capturing packet : {}", e);
            }
        }
    }
}