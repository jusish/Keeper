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
    flexDirection: 'column' as const,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#064e3b',
    textTransform: 'uppercase' as const,
  },
  subtitle: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
  },
  metaText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right' as const,
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
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    marginTop: 6,
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
  colTitle: {
    width: '26%',
    padding: 3,
    paddingLeft: 4,
  },
  colLender: {
    width: '20%',
    padding: 3,
  },
  colDates: {
    width: '14%',
    padding: 3,
  },
  colAmount: {
    width: '13%',
    padding: 3,
    textAlign: 'right',
  },
  colRepaid: {
    width: '13%',
    padding: 3,
    textAlign: 'right',
  },
  colBalance: {
    width: '14%',
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

interface DebtsStatementPDFProps {
  summary: any;
  tenantName: string;
  currency: string;
}

export const DebtsStatementPDF: React.FC<DebtsStatementPDFProps> = ({
  summary,
  tenantName,
  currency,
}) => {
  const debts = summary?.debts || [];

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{tenantName} — Debts & Liabilities Statement</Text>
              <Text style={styles.subtitle}>
                Total Liabilities: {debts.length} Records • Outstanding: {Number(summary?.totalOutstanding || 0).toLocaleString()} {currency}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Official Treasury Statement</Text>
              <Text style={styles.metaText}>Generated: {new Date().toLocaleDateString('en-GB')}</Text>
            </View>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Principal Borrowed</Text>
            <Text style={styles.kpiValue}>
              {Number(summary?.totalBorrowed || 0).toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Principal Repaid</Text>
            <Text style={[styles.kpiValue, { color: '#047857' }]}>
              {Number(summary?.totalRepaid || 0).toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Remaining Liability</Text>
            <Text style={[styles.kpiValue, { color: '#b91c1c' }]}>
              {Number(summary?.totalOutstanding || 0).toLocaleString()} {currency}
            </Text>
          </View>
        </View>

        {/* Debts Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colTitle}>Debt Title / Purpose</Text>
            <Text style={styles.colLender}>Lender / Creditor</Text>
            <Text style={styles.colDates}>Borrow / Due Date</Text>
            <Text style={styles.colAmount}>Principal</Text>
            <Text style={styles.colRepaid}>Repaid</Text>
            <Text style={styles.colBalance}>Balance Due</Text>
          </View>

          {debts.map((d: any, idx: number) => (
            <View
              key={d.id || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colTitle}>{d.title}</Text>
              <Text style={styles.colLender}>
                {d.lenderName} {d.lenderContact ? `(${d.lenderContact})` : ''}
              </Text>
              <Text style={styles.colDates}>
                {d.borrowDate ? new Date(d.borrowDate).toLocaleDateString('en-GB') : '-'}
                {d.dueDate ? ` to ${new Date(d.dueDate).toLocaleDateString('en-GB')}` : ''}
              </Text>
              <Text style={styles.colAmount}>
                {Number(d.principalAmount || 0).toLocaleString()}
              </Text>
              <Text style={styles.colRepaid}>
                {Number(d.repaidAmount || 0).toLocaleString()}
              </Text>
              <Text style={styles.colBalance}>
                {Number(d.remainingAmount || 0).toLocaleString()}
              </Text>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.colTitle}>Total ({debts.length} records)</Text>
            <Text style={styles.colLender}></Text>
            <Text style={styles.colDates}></Text>
            <Text style={styles.colAmount}>
              {Number(summary?.totalBorrowed || 0).toLocaleString()}
            </Text>
            <Text style={styles.colRepaid}>
              {Number(summary?.totalRepaid || 0).toLocaleString()}
            </Text>
            <Text style={styles.colBalance}>
              {Number(summary?.totalOutstanding || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text>Treasurer / Accountant</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Auditing Committee</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Chairperson / President</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
