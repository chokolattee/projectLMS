import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '@/constants/colors';
import { Subject, Topic, Module } from '@/types/faculty';
import { router } from 'expo-router';

interface FacultyHeaderProps {
  subject: Subject | null;
  module: Module | null;
  topic: Topic | null;
  onOpenSubjectModal: () => void;
}

export function FacultyHeader({
  subject,
  module,
  topic,
  onOpenSubjectModal,
}: FacultyHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Breadcrumbs Row */}
      <View style={styles.breadcrumbRow}>
        <Pressable onPress={() => router.push('/')}>
          <Text style={styles.crumbRoot}>LMS</Text>
        </Pressable>
        <Text style={styles.crumbSeparator}>/</Text>
        <Text style={styles.crumbItem}>Faculty Course Management</Text>
        <Text style={styles.crumbSeparator}>/</Text>
        <Text style={styles.crumbActive}>{subject?.code || 'NO SUBJECT'}</Text>
        {module && (
          <>
            <Text style={styles.crumbSeparator}>/</Text>
            <Text style={styles.crumbTruncated} numberOfLines={1}>{module.title}</Text>
          </>
        )}
        {topic && (
          <>
            <Text style={styles.crumbSeparator}>/</Text>
            <Text style={styles.crumbCurrent} numberOfLines={1}>{topic.title}</Text>
          </>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8' }}>LOGGED IN AS:</Text>
          <View style={{ backgroundColor: '#EBF5FB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#2980B9' }}>FACULTY</Text>
          </View>
        </View>
        <Pressable style={styles.actionBtnPrimary} onPress={onOpenSubjectModal}>
          <Text style={styles.actionTextPrimary}>+ Initialize Subject</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 48,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 16,
  },
  crumbRoot: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  crumbSeparator: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  crumbItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  crumbActive: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
  },
  crumbTruncated: {
    fontSize: 11,
    color: COLORS.textSecondary,
    maxWidth: 160,
  },
  crumbCurrent: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    maxWidth: 200,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  actionTextPrimary: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
});
