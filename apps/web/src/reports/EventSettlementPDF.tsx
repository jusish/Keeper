import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#059669',
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#064e3b',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
  },
  metaText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  kpiBox: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  kpiLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 0.8,
    borderBottomColor: '#94a3b8',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    minHeight: 14,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  colMember: {
    width: '32%',
    padding: 3,
    paddingLeft: 4,
  },
  colTarget: {
    width: '17%',
    padding: 3,
    textAlign: 'right',
  },
  colPaid: {
    width: '17%',
    padding: 3,
    textAlign: 'right',
  },
  colRemaining: {
    width: '17%',
    padding: 3,
    textAlign: 'right',
  },
  colSurplus: {
    width: '17%',
    padding: 3,
    textAlign: 'right',
    paddingRight: 4,
  },
  footerRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    fontWeight: 'bold',
    minHeight: 16,
    alignItems: 'center',
  },
  signatures: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  sigBox: {
    width: 140,
    borderTopWidth: 0.8,
    borderTopColor: '#64748b',
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 8,
    color: '#475569',
  },
});

interface EventSettlementPDFProps {
  settlement: any;
  tenantName: string;
  currency: string;
}

export const EventSettlementPDF: React.FC<EventSettlementPDFProps> = ({
  settlement,
  tenantName,
  currency,
}) => {
  const event = settlement.event || {};
  const members = settlement.members || [];

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{tenantName} — Event & Project Settlement</Text>
              <Text style={styles.subtitle}>
                Project: {event.title} • Date: {event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-GB') : 'N/A'} • Location: {event.location || 'General'}
              </Text>
            </View>
            <View>
              <Text style={styles.metaText}>Generated on: {new Date().toLocaleDateString('en-GB')}</Text>
              <Text style={styles.metaText}>Status: Active Ledger</Text>
            </View>
          </View>
        </View>

        {/* Financial KPI Summary */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Budgeted</Text>
            <Text style={styles.kpiValue}>
              {Number(settlement.totalAssessed || 0).toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Collected</Text>
            <Text style={[styles.kpiValue, { color: '#047857' }]}>
              {Number(settlement.totalCollected || 0).toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Expenses Paid Out</Text>
            <Text style={[styles.kpiValue, { color: '#b91c1c' }]}>
              {Number(settlement.expensesTotal || 0).toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Net Balance / Reserve</Text>
            <Text style={[styles.kpiValue, { color: '#1d4ed8' }]}>
              {Number(settlement.netMargin || 0).toLocaleString()} {currency}
            </Text>
          </View>
        </View>

        {/* Member Settlement Table */}
        <Text style={styles.sectionTitle}>
          Member Contributions & Quota Settlement ({members.length} Members)
        </Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colMember}>Member Name (Code)</Text>
            <Text style={styles.colTarget}>Target ({currency})</Text>
            <Text style={styles.colPaid}>Paid ({currency})</Text>
            <Text style={styles.colRemaining}>Remaining ({currency})</Text>
            <Text style={styles.colSurplus}>Surplus (+) ({currency})</Text>
          </View>

          {/* Rows */}
          {members.map((m: any, idx: number) => (
            <View
              key={m.memberId || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colMember}>
                {m.memberName} {m.membershipCode ? `(${m.membershipCode})` : ''}
              </Text>
              <Text style={styles.colTarget}>
                {Number(m.totalTarget || 0).toLocaleString()}
              </Text>
              <Text style={styles.colPaid}>
                {Number(m.totalPaid || 0).toLocaleString()}
              </Text>
              <Text style={styles.colRemaining}>
                {Number(m.totalRemaining || 0) > 0 ? Number(m.totalRemaining).toLocaleString() : '0'}
              </Text>
              <Text style={styles.colSurplus}>
                {Number(m.totalSurplus || 0) > 0 ? `+${Number(m.totalSurplus).toLocaleString()}` : '-'}
              </Text>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.colMember}>Grand Totals</Text>
            <Text style={styles.colTarget}>
              {Number(settlement.totalAssessed || 0).toLocaleString()}
            </Text>
            <Text style={styles.colPaid}>
              {Number(settlement.totalCollected || 0).toLocaleString()}
            </Text>
            <Text style={styles.colRemaining}>
              {Number(settlement.totalRemaining || 0).toLocaleString()}
            </Text>
            <Text style={styles.colSurplus}>
              {Number(settlement.totalSurplus || 0) > 0 ? `+${Number(settlement.totalSurplus).toLocaleString()}` : '-'}
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text>Event / Project Coordinator</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Accountant / Treasurer</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Chairperson / President</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
