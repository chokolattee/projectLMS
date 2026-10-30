import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '@/constants/colors';
import { Subject, Topic } from '@/types/faculty';

interface ContextInspectorProps {
  subject: Subject | null;
  topic: Topic | null;
  onPublishTopic: () => void;
  onOpenSubjectModal: () => void;
}

export function ContextInspector({
  subject,
  topic,
  onPublishTopic,
  onOpenSubjectModal,
}: ContextInspectorProps) {
  const isPublished = topic?.status === 'published';
  const wordCount = (topic?.content?.richText || '').trim().split(/\s+/).filter(Boolean).length;
  const questionsCount = topic?.quiz?.questions?.length || 0;
  const hasTimer = topic?.quiz?.hasTimer ?? true;
  const duration = topic?.quiz?.durationMinutes || 15;
  const passingScore = topic?.quiz?.passingScorePercent || 75;

  return (
    <View style={styles.container}>
      {/* Subject Identity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>COURSE METADATA</Text>
          <Pressable onPress={onOpenSubjectModal}>
            <Text style={styles.editAction}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Course Code</Text>
          <View style={styles.codeTag}>
            <Text style={styles.codeTagText}>{subject?.code || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Academic Year</Text>
          <Text style={styles.metaVal}>{subject?.academicYear || '2026-2027'}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Semester</Text>
          <Text style={styles.metaVal}>{subject?.semester || '1st Semester'}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Year Level</Text>
          <Text style={styles.metaVal}>{subject?.yearLevel || '1st Year'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Topic Assets Audit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LESSON ASSET AUDIT</Text>

        <View style={styles.auditCard}>
          <View style={styles.auditItem}>
            <View style={styles.auditDetails}>
              <Text style={styles.auditName}>Text Content</Text>
              <Text style={styles.auditStatus}>
                {wordCount > 0 ? `${wordCount} words` : 'Empty'}
              </Text>
            </View>
            <Text style={wordCount > 0 ? styles.checkGreen : styles.checkMuted}>
              {wordCount > 0 ? 'COMPLETE' : 'PENDING'}
            </Text>
          </View>

          <View style={styles.auditItem}>
            <View style={styles.auditDetails}>
              <Text style={styles.auditName}>Presentation (AWS S3)</Text>
              <Text style={styles.auditStatus}>
                {topic?.content?.presentationS3Key ? 'Stored on S3' : 'Not attached'}
              </Text>
            </View>
            <Text style={topic?.content?.presentationS3Key ? styles.checkGreen : styles.checkMuted}>
              {topic?.content?.presentationS3Key ? 'ATTACHED' : 'NONE'}
            </Text>
          </View>

          <View style={styles.auditItem}>
            <View style={styles.auditDetails}>
              <Text style={styles.auditName}>Topic Summary</Text>
              <Text style={styles.auditStatus}>
                {topic?.content?.summaryText
                  ? `${topic.content.summaryText.length} chars`
                  : topic?.content?.summaryBullets && topic.content.summaryBullets.length > 0
                  ? `${topic.content.summaryBullets.length} key takeaways`
                  : 'Pending'}
              </Text>
            </View>
            <Text style={(topic?.content?.summaryText || (topic?.content?.summaryBullets && topic.content.summaryBullets.length > 0)) ? styles.checkGreen : styles.checkMuted}>
              {(topic?.content?.summaryText || (topic?.content?.summaryBullets && topic.content.summaryBullets.length > 0)) ? 'READY' : 'PENDING'}
            </Text>
          </View>

          <View style={styles.auditItem}>
            <View style={styles.auditDetails}>
              <Text style={styles.auditName}>Multiple Choice Assessment</Text>
              <Text style={styles.auditStatus}>
                {questionsCount} questions | {hasTimer ? `${duration}m limit` : 'Untimed'} | {passingScore}% pass
              </Text>
            </View>
            <Text style={questionsCount > 0 ? styles.checkGreen : styles.checkMuted}>
              {questionsCount > 0 ? 'CONFIGURED' : 'PENDING'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Publication Workflow */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PUBLICATION STATUS</Text>
        <View style={styles.publishBox}>
          <Text style={styles.publishStatusLabel}>Current Visibility:</Text>
          <View style={[styles.statusPill, isPublished ? styles.pillLive : styles.pillDraft]}>
            <Text style={[styles.statusPillText, isPublished ? styles.textLive : styles.textDraft]}>
              {isPublished ? 'PUBLISHED' : 'DRAFT'}
            </Text>
          </View>
          <Pressable
            style={[styles.publishActionBtn, isPublished ? styles.actionUnpublish : styles.actionPublish]}
            onPress={onPublishTopic}
          >
            <Text style={[styles.actionBtnText, isPublished ? styles.textActionUnpub : styles.textActionPub]}>
              {isPublished ? 'Revert to Draft' : 'Publish to Students'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    padding: 16,
    height: '100%',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  editAction: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  codeTag: {
    backgroundColor: '#FDEDEC',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  codeTagText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  auditCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EAECEF',
    padding: 10,
    gap: 8,
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 6,
  },
  auditDetails: { flex: 1, marginRight: 8 },
  auditName: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  auditStatus: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },
  checkGreen: { fontSize: 9, fontWeight: '800', color: '#27AE60' },
  checkMuted: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted },
  publishBox: {
    backgroundColor: '#FCFCFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  publishStatusLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  statusPill: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  pillLive: { backgroundColor: '#EAFAF1' },
  pillDraft: { backgroundColor: '#FEF9E7' },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  textLive: { color: '#27AE60' },
  textDraft: { color: '#D35400' },
  publishActionBtn: {
    borderRadius: 4,
    paddingVertical: 7,
    alignItems: 'center',
  },
  actionPublish: { backgroundColor: COLORS.primary },
  actionUnpublish: { backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: COLORS.border },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  textActionPub: { color: COLORS.white },
  textActionUnpub: { color: COLORS.textSecondary },
});
