// Dynamic import of @react-pdf/renderer to reduce bundle size
// The library is ~1.5MB and only needed when generating PDFs

let pdfModule = null

const loadPdfModule = async () => {
  if (!pdfModule) {
    pdfModule = await import('@react-pdf/renderer')
  }
  return pdfModule
}

const styles = {
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 5 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#1a1a2e' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '23%', padding: 10, backgroundColor: '#f3f4f6', borderRadius: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  statLabel: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  insight: { padding: 8, backgroundColor: '#ecfdf5', borderRadius: 4, marginBottom: 5 },
  insightText: { fontSize: 10, color: '#065f46' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
  valueBox: { padding: 15, backgroundColor: '#f0fdf4', borderRadius: 8, marginTop: 10 },
  valueText: { fontSize: 28, fontWeight: 'bold', color: '#00d49a' },
}

const createReportDocument = (pdfLib, report) => {
  const { Document, Page, Text, View, StyleSheet } = pdfLib
  const pdfStyles = StyleSheet.create(styles)

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Rapport de Valeur</Text>
          <Text style={pdfStyles.subtitle}>{report.clientName} — {report.periodLabel}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Métriques clés</Text>
          <View style={pdfStyles.statsGrid}>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{report.stats?.emailsSent || 0}</Text>
              <Text style={pdfStyles.statLabel}>Emails envoyés</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{report.stats?.openRate || 0}%</Text>
              <Text style={pdfStyles.statLabel}>Taux d'ouverture</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{report.stats?.replyRate || 0}%</Text>
              <Text style={pdfStyles.statLabel}>Taux de réponse</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{report.stats?.replied || 0}</Text>
              <Text style={pdfStyles.statLabel}>Réponses</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Valeur estimée générée</Text>
          <View style={pdfStyles.valueBox}>
            <Text style={pdfStyles.valueText}>
              {(report.estimatedValue || 0).toLocaleString('fr-FR')} €
            </Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Points clés</Text>
          {(report.insights || report.highlights || []).map((insight, i) => (
            <View key={i} style={pdfStyles.insight}>
              <Text style={pdfStyles.insightText}>✓ {insight}</Text>
            </View>
          ))}
        </View>

        <Text style={pdfStyles.footer}>
          Généré par Face Media Factory — {new Date().toLocaleDateString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}

export async function downloadReportPdf(report) {
  // Dynamically load the PDF library only when needed
  const pdfLib = await loadPdfModule()
  const { pdf } = pdfLib

  const doc = createReportDocument(pdfLib, report)
  const blob = await pdf(doc).toBlob()

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `rapport_${report.clientName?.replace(/\s+/g, '_') || 'client'}_${report.periodLabel?.replace(/\s+/g, '_') || 'periode'}.pdf`
  link.click()
  URL.revokeObjectURL(link.href)
}
