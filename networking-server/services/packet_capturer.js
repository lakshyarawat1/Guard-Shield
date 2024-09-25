import { exec } from "child_process";
import { io } from "../index.js";

export function execute_tshark(socket) {
  const tSharkScript = exec(
    `C:/"Program Files"/Wireshark/tshark.exe -i Wi-Fi -w output_capture_file.pcap -Tjson -e frame.time -e frame.len \
-e wlan.sa -e wlan.da -e wlan.bssid -e wlan.ssid -e wlan.fc.type -e wlan.fc.subtype \
-e radiotap.channel.freq -e radiotap.channel.flags -e radiotap.dbm_antsignal \
-e ip.src -e ip.dst -e ip.proto -e ip.ttl \
-e tcp.srcport -e tcp.dstport -e tcp.flags \
-e udp.srcport -e udp.dstport
  `);

  let accumulatedData = "";

  tSharkScript.stdout.on("data", (data) => {
    console.log(`data`, data);
    socket.emit('data', data);
    return data;
  });

  tSharkScript.stderr.on("data", (data) => {
    socket.emit("captured_data", data);

    console.error(`${data}`);
    return data;
  });

  tSharkScript.on("close", (code) => {
    console.log(`close: ${code}`);
  });
}

export function read_TSHARK(callback) {
  const tSharkScript = exec(
    `C:/"Program Files"/Wireshark/tshark.exe -r output_capture_file.pcap -Tjson -e frame.time -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport -e ip.proto -e frame.len -e ip.hdr_len -e tcp.analysis.bytes_in_flight > output.txt`
  );

  tSharkScript.stdout.on("data", (data) => {
    console.log(`output: ${data}`);
  });

  tSharkScript.stderr.on("data", (data) => {
    console.error(`error: ${data}`);
  });

  tSharkScript.on("close", (code) => {
    console.log(`close: ${code}`);
  });
}
