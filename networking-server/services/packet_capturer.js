import { exec } from "child_process";

export function execute_tshark(socket) {
  const tSharkScript = exec(
    `C:/"Program Files"/Wireshark/tshark.exe -i Wi-Fi -w output_capture_file.pcap -Tjson -e _ws.col.info -e frame.number -e frame.time -e frame.len \
-e eth.src -e eth.dst -e ip.src -e ip.dst -e ip.proto \
-e ip.ttl -e tcp.srcport -e tcp.dstport \
-e udp.srcport -e udp.dstport -e dns.qry.name -e dns.qry.type \
-e http.request.method -e http.host -e icmp.type -e ssl.record.version \
  `
  );


  tSharkScript.stdout.on("data", (data) => {
    console.log(`data`, data);
    socket.emit("data", data);
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
    `C:/"Program Files"/Wireshark/tshark.exe -r output_capture_file.pcap -Tjson -e frame.number -e frame.time_epoch -e ip.src -e ip.dst -e_ws.col.info -e tcp.srcport -e tcp.dstport -e ip.proto -e frame.len -e ip.hdr_len -e tcp.analysis.bytes_in_flight > output.txt`
  );

  const flows= {}

  tSharkScript.stdout.on("data", (data) => {

    const packets = JSON.parse(data);
    packets.forEach(packet => {
      const streamId = packet._ws.col.info;
      const timestamp = packet.frame.time_epoch

      if (!flows[streamId]) {
        flows[streamId] = { start: Number(timestamp), end: Number(timestamp) };
      }
      else {
        flows[streamId].end = Number(timestamp);
      }
    })

    const flowDurations = {}
    Object.keys(flows).forEach(id => {
      const { start, end } = flows[id];
      flowDurations[id] = (end - start);
    })
    console.log(flowDurations);
    console.log(`output: ${data}`);
  });

  tSharkScript.stderr.on("data", (data) => {
    console.error(`error: ${data}`);
  });

  tSharkScript.on("close", (code) => {
    console.log(`close: ${code}`);
  });
}
