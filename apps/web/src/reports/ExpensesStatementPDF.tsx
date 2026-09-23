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
  colTitle: {
    width: '28%',
    padding: 3,
    paddingLeft: 4,
  },
  colCategory: {
    width: '18%',
    padding: 3,
  },
  colVendor: {
    width: '18%',
    padding: 3,
  },
  colDate: {
    width: '12%',
    padding: 3,
  },
  colPlanned: {
    width: '10%',
    padding: 3,
    textAlign: 'center',
  },
  colAmount: {
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

interface ExpensesStatementPDFProps {
  expenses: any[];
  tenantName: string;
  currency: string;
}

export const ExpensesStatementPDF: React.FC<ExpensesStatementPDFProps> = ({
  expenses,
  tenantName,
  currency,
}) => {
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const plannedSpent = expenses
    .filter((e) => e.isPlanned)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const unplannedSpent = expenses
    .filter((e) => !e.isPlanned)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{tenantName} — Expenses & Outflows Report</Text>
              <Text style={styles.subtitle}>
                Total Disbursements: {expenses.length} Records • Total Outflow: {totalSpent.toLocaleString()} {currency}
              </Text>
            </View>
            <View>
              <Text style={styles.metaText}>Generated on: {new Date().toLocaleDateString('en-GB')}</Text>
              <Text style={styles.metaText}>Disbursements Ledger</Text>
            </View>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Outflow</Text>
            <Text style={[styles.kpiValue, { color: '#b91c1c' }]}>
              {totalSpent.toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Pre-Planned Outflow</Text>
            <Text style={styles.kpiValue}>
              {plannedSpent.toLocaleString()} {currency}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Unplanned / Ad-hoc</Text>
            <Text style={[styles.kpiValue, { color: '#d97706' }]}>
              {unplannedSpent.toLocaleString()} {currency}
            </Text>
          </View>
        </View>

        {/* Expenses Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colTitle}>Expense Item / Purpose</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colVendor}>Vendor / Payee</Text>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colPlanned}>Budget Plan</Text>
            <Text style={styles.colAmount}>Amount ({currency})</Text>
          </View>

          {expenses.map((e: any, idx: number) => (
            <View
              key={e.id || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colTitle}>{e.title}</Text>
              <Text style={styles.colCategory}>{e.category}</Text>
              <Text style={styles.colVendor}>{e.vendorName || '-'}</Text>
              <Text style={styles.colDate}>
                {e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('en-GB') : '-'}
              </Text>
              <Text style={styles.colPlanned}>{e.isPlanned ? 'Planned' : 'Unplanned'}</Text>
              <Text style={styles.colAmount}>
                {Number(e.amount || 0).toLocaleString()}
              </Text>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.colTitle}>Total Disbursements ({expenses.length})</Text>
            <Text style={styles.colCategory}></Text>
            <Text style={styles.colVendor}></Text>
            <Text style={styles.colDate}></Text>
            <Text style={styles.colPlanned}></Text>
            <Text style={styles.colAmount}>{totalSpent.toLocaleString()}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text>Accountant / Cashier</Text>
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
