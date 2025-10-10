export type PacketType = {
    frame_len: string[],
    frame_time: string[],
    ip_src: string[],
    ip_dst: string[],
    tcp_srcport: string[]
    tcp_dstport: string[]
    ip_proto: number
    _ws_col_info: string[],
    ip_ttl: string[],
    tcp_flags: string[],
    udp_srcport: string[],
    udp_dstport: string[],
    eth_src: string[],
    eth_dst: string[],
    
}