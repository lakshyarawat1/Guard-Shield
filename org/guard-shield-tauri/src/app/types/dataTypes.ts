export interface PacketType {
    frame_time: string[];
    frame_len: string[];
    ip_src: string[];
    ip_dst: string[];
    ip_proto: string[];
    ip_ttl: string[];
    tcp_srcport: string[];
    tcp_dstport: string[];
    tcp_flags: string[];
    udp_srcport: string[];
    udp_dstport: string[];
    _ws_col_info: string[];
    eth_src: string[];
    eth_dst: string[];
}