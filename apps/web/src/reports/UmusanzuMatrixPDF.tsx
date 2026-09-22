import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { ContributionMatrixResponse, AssessmentStatus } from '@keeper/shared';

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
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    marginTop: 8,
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
    width: '18%',
    padding: 3,
    paddingLeft: 4,
  },
  colVoice: {
    width: '6%',
    padding: 3,
    textAlign: 'center',
    color: '#64748b',
  },
  colMonth: {
    width: '5.2%',
    padding: 3,
    textAlign: 'center',
  },
  colSummary: {
    width: '7%',
    padding: 3,
    textAlign: 'right',
    paddingRight: 4,
  },
  paidChip: {
    color: '#065f46',
    fontWeight: 'bold',
  },
  surplusChip: {
    color: '#047857',
    fontWeight: 'bold',
  },
  partialChip: {
    color: '#b45309',
  },
  unpaidChip: {
    color: '#cbd5e1',
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
    marginTop: 20,
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

interface UmusanzuMatrixPDFProps {
  data: ContributionMatrixResponse;
  tenantName: string;
  currency: string;
}

export const UmusanzuMatrixPDF: React.FC<UmusanzuMatrixPDFProps> = ({
  data,
  tenantName,
  currency,
}) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{tenantName} — Umusanzu Annual Ledger</Text>
              <Text style={styles.subtitle}>
                Plan: {data.plan.title} • Standard Contribution: {Number(data.plan.defaultAmount).toLocaleString()} {currency}
              </Text>
            </View>
            <View>
              <Text style={styles.metaText}>Generated on: {new Date().toLocaleDateString('en-GB')}</Text>
              <Text style={styles.metaText}>
                Collection Rate: {data.overallCollectionRate}% ({Number(data.grandTotalCollected).toLocaleString()} / {Number(data.grandTotalExpected).toLocaleString()} {currency})
              </Text>
            </View>
          </View>
        </View>

        {/* Matrix Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={styles.colMember}>Member Name</Text>
            <Text style={styles.colVoice}>Voice</Text>
            {data.periods.map((p) => (
              <Text key={p.id} style={styles.colMonth}>
                {p.label.split(' ')[0]}
              </Text>
            ))}
            <Text style={styles.colSummary}>Total Paid</Text>
            <Text style={styles.colSummary}>Surplus (+)</Text>
            <Text style={styles.colSummary}>Balance</Text>
          </View>

          {/* Rows */}
          {data.rows.map((row, idx) => (
            <View
              key={row.member.id}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colMember}>{row.member.fullName}</Text>
              <Text style={styles.colVoice}>{row.member.voicePart || '-'}</Text>

              {data.periods.map((p) => {
                const cell = row.cells[p.id];
                if (!cell || cell.paidAmount === 0) {
                  return <Text key={p.id} style={[styles.colMonth, styles.unpaidChip]}>-</Text>;
                }
                if (cell.status === AssessmentStatus.SURPLUS) {
                  return (
                    <Text key={p.id} style={[styles.colMonth, styles.surplusChip]}>
                      +{cell.surplusAmount.toLocaleString()}
                    </Text>
                  );
                }
                if (cell.status === AssessmentStatus.PAID) {
                  return (
                    <Text key={p.id} style={[styles.colMonth, styles.paidChip]}>
                      {cell.paidAmount.toLocaleString()}
                    </Text>
                  );
                }
                return (
                  <Text key={p.id} style={[styles.colMonth, styles.partialChip]}>
                    {cell.paidAmount.toLocaleString()}
                  </Text>
                );
              })}

              <Text style={styles.colSummary}>{row.totalPaid.toLocaleString()}</Text>
              <Text style={styles.colSummary}>
                {row.totalSurplus > 0 ? `+${row.totalSurplus.toLocaleString()}` : '-'}
              </Text>
              <Text style={styles.colSummary}>
                {row.totalRemaining > 0 ? row.totalRemaining.toLocaleString() : '0'}
              </Text>
            </View>
          ))}

          {/* Footer Totals */}
          <View style={styles.footerRow}>
            <Text style={styles.colMember}>Grand Totals ({data.rows.length} members)</Text>
            <Text style={styles.colVoice}>-</Text>
            {data.periods.map((p) => (
              <Text key={p.id} style={styles.colMonth}>
                {data.totalsByPeriod[p.id]?.collected?.toLocaleString() || '0'}
              </Text>
            ))}
            <Text style={styles.colSummary}>{data.grandTotalCollected.toLocaleString()}</Text>
            <Text style={styles.colSummary}>+{data.grandTotalSurplus.toLocaleString()}</Text>
            <Text style={styles.colSummary}>{data.grandTotalRemaining.toLocaleString()}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text>Prepared by: Accountant / Treasurer</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Verified by: Discipline Committee</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Approved by: President / Chairperson</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
