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
  colCode: {
    width: '14%',
    padding: 3,
    paddingLeft: 4,
    fontFamily: 'Helvetica-Bold',
  },
  colName: {
    width: '28%',
    padding: 3,
  },
  colPhone: {
    width: '18%',
    padding: 3,
  },
  colDate: {
    width: '14%',
    padding: 3,
  },
  colStatus: {
    width: '12%',
    padding: 3,
    textAlign: 'center',
  },
  colCredit: {
    width: '14%',
    padding: 3,
    textAlign: 'right',
    paddingRight: 4,
  },
  statusActive: {
    color: '#047857',
    fontWeight: 'bold',
  },
  statusInactive: {
    color: '#64748b',
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

interface MembersRosterPDFProps {
  members: any[];
  tenantName: string;
  currency: string;
}

export const MembersRosterPDF: React.FC<MembersRosterPDFProps> = ({
  members,
  tenantName,
  currency,
}) => {
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const totalCredit = members.reduce((sum, m) => sum + Number(m.creditBalance || 0), 0);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{tenantName} — Members Official Roster</Text>
              <Text style={styles.subtitle}>
                Total Enrolled: {members.length} • Active Members: {activeCount} • Advance Credit Reserve: {totalCredit.toLocaleString()} {currency}
              </Text>
            </View>
            <View>
              <Text style={styles.metaText}>Generated on: {new Date().toLocaleDateString('en-GB')}</Text>
              <Text style={styles.metaText}>Official Registry</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCode}>Member Code</Text>
            <Text style={styles.colName}>Full Name</Text>
            <Text style={styles.colPhone}>Phone Number</Text>
            <Text style={styles.colDate}>Join Date</Text>
            <Text style={styles.colStatus}>Status</Text>
            <Text style={styles.colCredit}>Advance Credit</Text>
          </View>

          {members.map((m, idx) => (
            <View
              key={m.id || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colCode}>{m.membershipCode || 'N/A'}</Text>
              <Text style={styles.colName}>{m.fullName}</Text>
              <Text style={styles.colPhone}>{m.phone || '-'}</Text>
              <Text style={styles.colDate}>
                {m.joinedDate ? new Date(m.joinedDate).toLocaleDateString('en-GB') : '-'}
              </Text>
              <Text
                style={[
                  styles.colStatus,
                  m.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive,
                ]}
              >
                {m.status}
              </Text>
              <Text style={styles.colCredit}>
                {Number(m.creditBalance || 0) > 0
                  ? `+${Number(m.creditBalance).toLocaleString()} ${currency}`
                  : '-'}
              </Text>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.colCode}>Grand Total</Text>
            <Text style={styles.colName}>{members.length} Members</Text>
            <Text style={styles.colPhone}></Text>
            <Text style={styles.colDate}></Text>
            <Text style={styles.colStatus}>{activeCount} Active</Text>
            <Text style={styles.colCredit}>
              +{totalCredit.toLocaleString()} {currency}
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text>Membership Officer</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>General Secretary</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>Chairperson / President</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
