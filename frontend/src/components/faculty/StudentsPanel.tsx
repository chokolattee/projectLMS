import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Platform } from 'react-native';
import { EnrolledStudent } from '@/types/faculty';
import { COLORS } from '@/constants/colors';
import { SECTIONS } from '@/constants/sections';
import { exportCsv, exportWord, exportPdf, ExportData } from '@/utils/exportStudents';  


interface Props {
  subjectName?: string;
  students: EnrolledStudent[];
  loading: boolean;
  error?: string;
}

const NO_SECTION = 'No Section';
const sectionList: readonly string[] = SECTIONS;

const sortBySurname = (list: EnrolledStudent[]) =>
  [...list].sort(
    (a, b) =>
      (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' }) ||
      (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
  );

export function StudentsPanel({ subjectName, students, loading, error }: Props) {
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [quizId, setQuizId] = useState<string>('');

  // Quiz list (1 topic = 1 quiz), taken from the students' score data
  const quizzes = (students[0]?.quizScores || []).map(q => ({
    topicId: q.topicId,
    title: q.topicTitle,
    total: q.totalQuestions,
  }));
  const activeQuiz = quizzes.find(q => q.topicId === quizId) || quizzes[0];

  const scoreText = (s: EnrolledStudent) => {
    const sc = s.quizScores?.find(q => q.topicId === activeQuiz?.topicId);
    return sc && sc.correctCount !== null && sc.correctCount !== undefined ? String(sc.correctCount) : '—';
  };

  // One separate roster per section
  const groups = [...sectionList, NO_SECTION]
    .map(name => ({
      name,
      list: sortBySurname(
        students.filter(s =>
          name === NO_SECTION ? !s.section || !sectionList.includes(s.section) : s.section === name
        )
      ),
    }))
    .filter(g => g.list.length > 0);

  const visibleGroups = sectionFilter === 'All' ? groups : groups.filter(g => g.name === sectionFilter);
    const buildExportData = (): ExportData => ({
    title: `Class List${subjectName ? ' - ' + subjectName : ''}`,
    subtitle: [
      sectionFilter === 'All' ? 'All sections' : sectionFilter,
      activeQuiz ? `Score out of ${activeQuiz.total} — ${activeQuiz.title}` : '',
      `Generated ${new Date().toLocaleDateString()}`,
    ]
      .filter(Boolean)
      .join(' · '),
    scoreLabel: activeQuiz ? `Score (/${activeQuiz.total})` : 'Score',
    groups: visibleGroups.map(g => ({
      name: g.name,
      rows: g.list.map((s, i) => {
        const score = scoreText(s);
        return {
          no: i + 1,
          tuptId: s.tuptId || '',
          name: `${s.lastName}, ${s.firstName}`,
          email: s.email,
          score: score === '—' ? '' : score,
          passed: (s.totalQuizzes || 0) > 0 ? `${s.passedQuizzes ?? 0}/${s.totalQuizzes}` : '',
        };
      }),
    })),
  });

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Enrolled Students</Text>
          <Text style={styles.count}>{students.length} total</Text>
        </View>
        {!!subjectName && <Text style={styles.sub}>{subjectName}</Text>}
                {Platform.OS === 'web' && students.length > 0 && (
          <View style={styles.exportRow}>
            <Text style={styles.exportLabel}>Download:</Text>
            <Pressable style={styles.exportBtn} onPress={() => exportPdf(buildExportData())}>
              <Text style={styles.exportBtnText}>PDF</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={() => exportWord(buildExportData())}>
              <Text style={styles.exportBtnText}>Word</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={() => exportCsv(buildExportData())}>
              <Text style={styles.exportBtnText}>Spreadsheet</Text>
            </Pressable>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', ...groups.map(g => g.name)].map(name => {
            const count = name === 'All' ? students.length : groups.find(g => g.name === name)?.list.length || 0;
            return (
              <Pressable
                key={name}
                onPress={() => setSectionFilter(name)}
                style={[styles.chip, sectionFilter === name && styles.chipActive]}
              >
                <Text style={[styles.chipText, sectionFilter === name && styles.chipTextActive]}>
                  {name} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {quizzes.length > 0 && (
          <>
            <Text style={styles.quizLabel}>Quiz score for:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quizRow}>
              {quizzes.map(q => (
                <Pressable
                  key={q.topicId}
                  onPress={() => setQuizId(q.topicId)}
                  style={[styles.chip, activeQuiz?.topicId === q.topicId && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activeQuiz?.topicId === q.topicId && styles.chipTextActive]}>
                    {q.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {loading && students.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : visibleGroups.length === 0 ? (
        <Text style={styles.empty}>No students enrolled in this class yet.</Text>
      ) : (
        visibleGroups.map(group => (
          <View key={group.name} style={[styles.card, styles.groupCard]}>
            <View style={styles.header}>
              <Text style={styles.groupTitle}>{group.name}</Text>
              <Text style={styles.count}>{group.list.length} student{group.list.length === 1 ? '' : 's'}</Text>
            </View>
            {activeQuiz && (
              <Text style={styles.sub}>
                Score out of {activeQuiz.total} — {activeQuiz.title}
              </Text>
            )}

            <View style={{ marginTop: 12 }}>
              <View style={[styles.row, styles.headRow]}>
                                <Text style={[styles.cell, styles.headText, styles.center, { flex: 0.8 }]}>{' '}</Text>
                <Text style={[styles.cell, styles.headText, styles.center, { flex: 0.8 }]}>{' '}</Text>
                <Text style={[styles.cell, styles.headText, { flex: 1 }]}>Student No.</Text>
                <Text style={[styles.cell, styles.headText, { flex: 1.3 }]}>TUPT-ID</Text>
                <Text style={[styles.cell, styles.headText, { flex: 2 }]}>Name</Text>
                <Text style={[styles.cell, styles.headText, { flex: 2 }]}>Email</Text>
                <Text style={[styles.cell, styles.headText, { flex: 0.8 }]}>Passed</Text>
              </View>
              {group.list.map((s, i) => {
                const number = i + 1;
                const isEven = number % 2 === 0;
                const score = scoreText(s);
                return (
                  <View key={s._id} style={styles.row}>
                    <Text style={[styles.cell, styles.score, styles.center, { flex: 0.8 }]}>{isEven ? score : ''}</Text>
                    <Text style={[styles.cell, styles.score, styles.center, { flex: 0.8 }]}>{!isEven ? score : ''}</Text>
                    <Text style={[styles.cell, { flex: 1 }]}>{number}</Text>
                    <Text style={[styles.cell, { flex: 1.3 }]}>{s.tuptId || '—'}</Text>
                    <Text style={[styles.cell, styles.name, { flex: 2 }]}>{s.lastName}, {s.firstName}</Text>
                    <Text style={[styles.cell, { flex: 2 }]}>{s.email}</Text>
                    <Text style={[styles.cell, { flex: 0.8 }]}>
                      {(s.totalQuizzes || 0) > 0 ? `${s.passedQuizzes ?? 0}/${s.totalQuizzes}` : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 20 },
  groupCard: { marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  groupTitle: { fontSize: 15, fontWeight: '800', color: '#134E4A' },
  count: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    exportRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  exportLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary },
  exportBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#134E4A', backgroundColor: '#F0FDFA' },
  exportBtnText: { fontSize: 11, fontWeight: '800', color: '#134E4A' },
  filterRow: { marginTop: 14, flexGrow: 0 },
  quizLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, marginTop: 14 },
  quizRow: { marginTop: 8, flexGrow: 0 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  chipActive: { backgroundColor: '#134E4A', borderColor: '#134E4A' },
  chipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  empty: { fontSize: 12, color: COLORS.textMuted, marginTop: 24, textAlign: 'center' },
  error: { fontSize: 12, color: '#B91C1C', marginTop: 24, textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headRow: { backgroundColor: '#F1F5F9' },
  cell: { fontSize: 12, color: COLORS.text, paddingHorizontal: 6 },
  center: { textAlign: 'center' },
  headText: { fontWeight: '800', color: COLORS.textSecondary },
  name: { fontWeight: '700' },
  score: { fontWeight: '800' },
});