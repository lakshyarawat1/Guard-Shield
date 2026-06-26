import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '2pt solid #e5e7eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 6,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingVertical: 4,
  },
  colLeft: {
    width: '70%',
    fontSize: 11,
    color: '#4b5563',
  },
  colRight: {
    width: '30%',
    fontSize: 11,
    color: '#111827',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  summaryBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    width: '30%',
    padding: 15,
    backgroundColor: '#f9fafb',
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});

export interface ReportData {
  total_alerts: number;
  total_packets: number;
  top_src_ips: { ip: string; count: number }[];
  top_rules: { rule_name: string; count: number }[];
  severity_counts: Record<string, number>;
}

interface SecurityReportProps {
  data: ReportData;
  timeRangeHours: number;
}

export const SecurityReport = ({ data, timeRangeHours }: SecurityReportProps) => {
  const timeRangeLabel = timeRangeHours === 0 ? "All Time" : `Last ${timeRangeHours} Hours`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Guard-Shield IDS/IPS Report</Text>
            <Text style={styles.date}>Generated on: {new Date().toLocaleString()}</Text>
          </View>
          <View>
            <Text style={styles.date}>Period: {timeRangeLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryBlock}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.total_packets.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Packets Analyzed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.total_alerts.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Threats Blocked</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.severity_counts['Critical'] || 0}</Text>
              <Text style={styles.statLabel}>Critical Alerts</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Threat Distribution by Severity</Text>
          {Object.entries(data.severity_counts).sort((a, b) => b[1] - a[1]).map(([severity, count]) => (
            <View style={styles.row} key={severity}>
              <Text style={styles.colLeft}>{severity}</Text>
              <Text style={styles.colRight}>{count.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 10 Malicious Source IPs</Text>
          <View style={[styles.row, { backgroundColor: '#f9fafb' }]}>
            <Text style={[styles.colLeft, { fontWeight: 'bold' }]}>Source IP</Text>
            <Text style={[styles.colRight, { fontWeight: 'bold' }]}>Blocked Count</Text>
          </View>
          {data.top_src_ips.map((item, idx) => (
            <View style={styles.row} key={idx}>
              <Text style={styles.colLeft}>{item.ip}</Text>
              <Text style={styles.colRight}>{item.count.toLocaleString()}</Text>
            </View>
          ))}
          {data.top_src_ips.length === 0 && (
            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 10 }}>No threats recorded in this period.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Triggered Rules / Signatures</Text>
          <View style={[styles.row, { backgroundColor: '#f9fafb' }]}>
            <Text style={[styles.colLeft, { fontWeight: 'bold' }]}>Rule Description</Text>
            <Text style={[styles.colRight, { fontWeight: 'bold' }]}>Hit Count</Text>
          </View>
          {data.top_rules.map((item, idx) => (
            <View style={styles.row} key={idx}>
              <Text style={styles.colLeft}>{item.rule_name}</Text>
              <Text style={styles.colRight}>{item.count.toLocaleString()}</Text>
            </View>
          ))}
          {data.top_rules.length === 0 && (
            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 10 }}>No rules triggered in this period.</Text>
          )}
        </View>

      </Page>
    </Document>
  );
};
