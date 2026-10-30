import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SubjectProgressReport } from '@/services/facultyApi';
import { Button } from '@/components/ui/Button';

interface Props {
  report: SubjectProgressReport;
  onClose: () => void;
}

export function FacultyProgressReport({ report, onClose }: Props) {
  const [sortBy, setSortBy] = useState<'surname' | 'score'>('surname');
  const students = useMemo(() => [...report.students].sort((a, b) => (
    sortBy === 'surname'
      ? `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      : b.overallScorePercent - a.overallScorePercent
  )), [report.students, sortBy]);

  const exportCsv = () => {
    const header = ['Surname', 'First Name', 'Email', 'Overall Score %', 'Passed Topics', 'Total Topics', 'Attempts', ...report.topics.map(topic => `${topic.moduleTitle} - ${topic.topicTitle}`)];
    const rows = students.map(student => [
      student.lastName,
      student.firstName,
      student.email,
      student.overallScorePercent,
      student.passedTopics,
      student.totalTopics,
      student.attemptsTotal,
      ...report.topics.map(topic => {
        const score = student.topicScores.find(item => item.topicId === topic.topicId);
        return score ? `${score.bestScorePercent}% (${score.attemptsCount} attempts${score.passed ? ', passed' : ''})` : 'Not attempted';
      }),
    ]);
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${report.subject.code}-quiz-report.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    }
  };

  const printReport = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const rows = students.map(student => `
        <tr><td>${student.lastName}, ${student.firstName}</td><td>${student.email}</td>
        <td>${student.overallScorePercent}%</td><td>${student.passedTopics}/${student.totalTopics}</td>
        <td>${student.attemptsTotal}</td><td>${student.topicScores.map(topic => `${topic.topicTitle}: ${topic.attempts.map(attempt => `${attempt.scorePercent}%`).join(' → ') || 'Not attempted'}`).join('<br>')}</td></tr>
      `).join('');
      const reportWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!reportWindow) return;
      reportWindow.document.write(`
        <html><head><title>${report.subject.code} Quiz Report</title>
        <style>
          body{font-family:Arial,sans-serif;color:#172033;margin:40px}
          h1{margin-bottom:4px} .meta{color:#536174;margin-bottom:24px}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th{background:#0f766e;color:white;text-align:left} th,td{border:1px solid #cbd5e1;padding:8px;vertical-align:top}
          .footer{margin-top:24px;color:#64748b;font-size:10px}
        </style></head><body>
        <h1>${report.subject.name}</h1>
        <div class="meta"><b>${report.subject.code}</b> · ${report.subject.academicYear || ''} · ${report.subject.semester || ''} · ${report.subject.yearLevel || ''}<br>
        Professor: ${report.subject.professorName || 'Faculty Instructor'} ${report.subject.professorEmail ? `· ${report.subject.professorEmail}` : ''}<br>
        Generated: ${new Date(report.generatedAt).toLocaleString()}</div>
        <table><thead><tr><th>Student</th><th>Email</th><th>Overall</th><th>Passed Topics</th><th>Attempts</th><th>Topic Scores by Attempt</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="footer">Official assessment summary · Best score shown in the overall score; attempt history is listed per topic.</div>
        </body></html>
      `);
      reportWindow.document.close();
      reportWindow.focus();
      reportWindow.print();
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ASSESSMENT REPORT</Text>
          <Text style={styles.title}>{report.subject.code} — {report.subject.name}</Text>
          <Text style={styles.subtitle}>
            Professor: {report.subject.professorName || 'Faculty Instructor'} · {report.subject.code} · {report.subject.academicYear || ''} · {report.subject.semester || ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title="Export Excel (CSV)" variant="secondary" size="sm" onPress={exportCsv} />
          <Button title="Print / PDF" variant="secondary" size="sm" onPress={printReport} />
          <Button title="Close" variant="primary" size="sm" onPress={onClose} />
        </View>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort students:</Text>
        {(['surname', 'score'] as const).map(option => (
          <Pressable key={option} onPress={() => setSortBy(option)} style={[styles.sortButton, sortBy === option && styles.sortButtonActive]}>
            <Text style={[styles.sortText, sortBy === option && styles.sortTextActive]}>{option === 'surname' ? 'Surname' : 'Score'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.body}>
        <View style={styles.summaryGrid}>
          {report.modules.map(module => (
            <View key={module.moduleId} style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{module.moduleTitle}</Text>
              <Text style={styles.summaryValue}>{module.averageScorePercent}%</Text>
              <Text style={styles.summaryMeta}>Average score · {module.topicCount} quiz topics</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {['Student', 'Email', 'Overall', 'Passed', 'Attempts', 'Topic scores by attempt'].map(label => (
              <Text key={label} style={[styles.tableCell, styles.tableHeaderText]}>{label}</Text>
            ))}
          </View>
          {students.map(student => (
            <View key={student.studentId} style={styles.tableRow}>
              <Text style={styles.tableCell}>{student.lastName}, {student.firstName}</Text>
              <Text style={styles.tableCell}>{student.email}</Text>
              <Text style={styles.tableCell}>{student.overallScorePercent}%</Text>
              <Text style={styles.tableCell}>{student.passedTopics}/{student.totalTopics}</Text>
              <Text style={styles.tableCell}>{student.attemptsTotal}</Text>
              <Text style={[styles.tableCell, styles.topicScoresCell]}>
                {student.topicScores.map(topic => `${topic.topicTitle}: ${topic.attempts.map(attempt => `${attempt.scorePercent}%`).join(' → ') || 'Not attempted'}`).join('\n')}
              </Text>
            </View>
          ))}
        </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC', padding: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 16 },
  kicker: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#64748B', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortLabel: { color: '#475569', fontSize: 12, fontWeight: '700' },
  sortButton: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  sortButtonActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  sortText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  sortTextActive: { color: '#FFFFFF' },
  body: { flex: 1 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  summaryCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, minWidth: 180, flex: 1 },
  summaryTitle: { color: '#334155', fontSize: 12, fontWeight: '800' },
  summaryValue: { color: '#0F766E', fontSize: 25, fontWeight: '900', marginTop: 6 },
  summaryMeta: { color: '#64748B', fontSize: 11, marginTop: 2 },
  studentCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 14, marginBottom: 12 },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  studentName: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
  studentEmail: { color: '#64748B', fontSize: 11, marginTop: 2 },
  studentStats: { alignItems: 'flex-end' },
  overallScore: { color: '#0F766E', fontSize: 20, fontWeight: '900' },
  studentMeta: { color: '#64748B', fontSize: 11 },
  topicRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 9, gap: 12 },
  topicName: { flex: 1 },
  moduleText: { color: '#94A3B8', fontSize: 10, fontWeight: '700' },
  topicText: { color: '#334155', fontSize: 12, fontWeight: '700', marginTop: 2 },
  attemptText: { color: '#64748B', fontSize: 11, width: 90 },
  scoreText: { fontSize: 14, fontWeight: '900', width: 48, textAlign: 'right' },
  passed: { color: '#059669' },
  failed: { color: '#D97706' },
  statusText: { color: '#64748B', fontSize: 11, width: 70, textAlign: 'right' },
  table: { minWidth: 980, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'stretch' },
  tableHeader: { backgroundColor: '#0F766E' },
  tableCell: { width: 150, padding: 10, color: '#334155', fontSize: 11, borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  tableHeaderText: { color: '#FFFFFF', fontWeight: '800' },
  topicScoresCell: { width: 360, lineHeight: 18 },
});
