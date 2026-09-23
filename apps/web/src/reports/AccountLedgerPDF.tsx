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
  colDate: {
    width: '14%',
    padding: 3,
    paddingLeft: 4,
  },
  colDesc: {
    width: '36%',
    padding: 3,
  },
  colRef: {
    width: '16%',
    padding: 3,
  },
  colIn: {
    width: '17%',
    padding: 3,
    textAlign: 'right',
    color: '#047857',
  },
  colOut: {
    width: '17%',
    padding: 3,
    textAlign: 'right',
    paddingRight: 4,
    color: '#b91c1c',
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

interface AccountLedgerPDFProps {
  account: any;
  transactions: any[];
  tenantName: string;
  currency: string;
}

export const AccountLedgerPDF: React.FC<AccountLedgerPDFProps> = ({
  account,
  transactions,
  tenantName,
  currency,
}) => {
  const totalIn = transactions
    .filter((t) => t.type === 'INFLOW')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalOut = transactions
    .filter((t) => t.type === 'OUTFLOW')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{tenantName} — Account Ledger Statement</Text>
              <Text style={styles.subtitle}>
                Account: {account?.name} ({account?.type}) • Number: {account?.accountNumber || 'Primary Vault'}
              </Text>
            </View>
            <View>
              <Text style={styles.metaText}>Generated on: {new Date().toLocaleDateString('en-GB')}</Text>
              <Text style={styles.metaText}>Official Statement</Text>
            </View>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Current Liquid Balance</Text>
            <Text style={[styles.kpiValue, { color: '#047857' }]}>
              {Number(account?.balance || 0).toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Period Inflows</Text>
            <Text style={[styles.kpiValue, { color: '#047857' }]}>
              +{totalIn.toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Period Outflows</Text>
            <Text style={[styles.kpiValue, { color: '#b91c1c' }]}>
              -{totalOut.toLocaleString()} {currency}
            </Text>
          </View>
        </View>

        {/* Ledger Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colDesc}>Transaction Description / Narration</Text>
            <Text style={styles.colRef}>Reference #</Text>
            <Text style={styles.colIn}>Credit / Inflow (+)</Text>
            <Text style={styles.colOut}>Debit / Outflow (-)</Text>
          </View>

          {transactions.map((t: any, idx: number) => (
            <View
              key={t.id || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colDate}>
                {t.date || t.createdAt ? new Date(t.date || t.createdAt).toLocaleDateString('en-GB') : '-'}
              </Text>
              <Text style={styles.colDesc}>{t.description || t.title || 'Ledger Entry'}</Text>
              <Text style={styles.colRef}>{t.referenceNumber || '-'}</Text>
              <Text style={styles.colIn}>
                {t.type === 'INFLOW' ? `+${Number(t.amount).toLocaleString()}` : '-'}
              </Text>
              <Text style={styles.colOut}>
                {t.type === 'OUTFLOW' ? `-${Number(t.amount).toLocaleString()}` : '-'}
              </Text>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.colDate}>Totals</Text>
            <Text style={styles.colDesc}>{transactions.length} Transactions</Text>
            <Text style={styles.colRef}></Text>
            <Text style={styles.colIn}>+{totalIn.toLocaleString()}</Text>
            <Text style={styles.colOut}>-{totalOut.toLocaleString()}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text>Accountant / Cashier</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Internal Auditor</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Chairperson / President</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
