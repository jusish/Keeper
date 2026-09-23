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
    width: '24%',
    padding: 3,
    paddingLeft: 4,
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
  filteredPeriods?: any[];
  periodLabel?: string;
}

export const UmusanzuMatrixPDF: React.FC<UmusanzuMatrixPDFProps> = ({
  data,
  tenantName,
  currency,
  filteredPeriods,
  periodLabel,
}) => {
  const periodsToRender = filteredPeriods && filteredPeriods.length > 0 ? filteredPeriods : data.periods;
  const hasPriorArrears = (data.grandTotalPreviousArrears || 0) > 0;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{tenantName} — Umusanzu Contributions Ledger</Text>
              <Text style={styles.subtitle}>
                Plan: {data.plan.title} {periodLabel ? `• Report Range: ${periodLabel}` : ''} • Standard: {Number(data.plan.defaultAmount).toLocaleString()} {currency}
                {data.predecessorPlanTitle ? ` • Carried from: ${data.predecessorPlanTitle}` : ''}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Collection Rate: {data.overallCollectionRate}% ({Number(data.grandTotalCollected).toLocaleString()} / {Number(data.grandTotalExpected).toLocaleString()} {currency})
              </Text>
              <Text style={styles.metaText}>Generated: {new Date().toLocaleDateString('en-GB')}</Text>
            </View>
          </View>
        </View>

        {/* Matrix Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={styles.colMember}>Member Name</Text>
            {periodsToRender.map((p) => (
              <Text key={p.id} style={styles.colMonth}>
                {p.label.split(' ')[0]}
              </Text>
            ))}
            <Text style={styles.colSummary}>Total Paid</Text>
            {hasPriorArrears && <Text style={styles.colSummary}>Prior Arrears</Text>}
            <Text style={styles.colSummary}>Advance (+)</Text>
            <Text style={styles.colSummary}>Balance Due</Text>
          </View>

          {/* Rows */}
          {data.rows.map((row, idx) => {
            const rowPaidInSlice = periodsToRender.reduce(
              (sum, p) => sum + (row.cells[p.id]?.paidAmount || 0),
              0
            );
            const rowRemainingInSlice = periodsToRender.reduce(
              (sum, p) => sum + (row.cells[p.id]?.remainingAmount || 0),
              0
            );
            const totalDue = rowRemainingInSlice + (row.previousArrears || 0);

            return (
              <View
                key={row.member.id}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.colMember}>
                  {row.member.fullName} {row.member.membershipCode ? `(${row.member.membershipCode})` : ''}
                </Text>

                {periodsToRender.map((p) => {
                  const cell = row.cells[p.id];
                  if (cell?.isExempt) {
                    return <Text key={p.id} style={[styles.colMonth, styles.unpaidChip]}>N/A</Text>;
                  }
                  if (!cell || cell.paidAmount === 0) {
                    return <Text key={p.id} style={[styles.colMonth, styles.unpaidChip]}>-</Text>;
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

                <Text style={styles.colSummary}>{rowPaidInSlice.toLocaleString()}</Text>
                {hasPriorArrears && (
                  <Text style={styles.colSummary}>
                    {row.previousArrears > 0 ? row.previousArrears.toLocaleString() : '-'}
                  </Text>
                )}
                <Text style={styles.colSummary}>
                  {(row.advanceCredit || row.member.creditBalance || 0) > 0
                    ? `+${(row.advanceCredit || row.member.creditBalance).toLocaleString()}`
                    : '-'}
                </Text>
                <Text style={styles.colSummary}>
                  {totalDue > 0 ? totalDue.toLocaleString() : '0'}
                </Text>
              </View>
            );
          })}

          {/* Footer Totals */}
          <View style={styles.footerRow}>
            <Text style={styles.colMember}>Grand Totals ({data.rows.length} members)</Text>
            {periodsToRender.map((p) => (
              <Text key={p.id} style={styles.colMonth}>
                {data.totalsByPeriod[p.id]?.collected?.toLocaleString() || '0'}
              </Text>
            ))}
            <Text style={styles.colSummary}>{data.grandTotalCollected.toLocaleString()}</Text>
            {hasPriorArrears && (
              <Text style={styles.colSummary}>
                {data.grandTotalPreviousArrears.toLocaleString()}
              </Text>
            )}
            <Text style={styles.colSummary}>+{(data.grandTotalAdvance || 0).toLocaleString()}</Text>
            <Text style={styles.colSummary}>
              {(data.grandTotalRemaining + (data.grandTotalPreviousArrears || 0)).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text>Prepared by: Accountant / Treasurer</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Verified by: Audit Committee</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Approved by: President / Chairperson</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
