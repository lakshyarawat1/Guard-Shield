export type PacketType = {
    frame_len: string,
    frame_time: {
        date: string,
        time: string,
    },
    ip_src: string,
    ip_dst: string,
    tcp_srcport: string
    tcp_dstport: string
    ip_proto: string
    _ws_col_info : string
}