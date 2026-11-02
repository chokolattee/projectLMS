import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CreateSubjectPayload, SemesterType, YearLevelType, Subject } from '@/types/faculty';

interface SubjectInitModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSubjectPayload) => Promise<boolean>;
  initialData?: Subject | null;
  mode?: 'create' | 'edit';
}

const SEMESTERS: SemesterType[] = ['1st Semester', '2nd Semester', '3rd Semester'];
const YEAR_LEVELS: YearLevelType[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029'];

export function SubjectInitModal({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: SubjectInitModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState<SemesterType>('1st Semester');
  const [yearLevel, setYearLevel] = useState<YearLevelType>('1st Year');

  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const [showYearLevelDropdown, setShowYearLevelDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setName(initialData.name || '');
      setCode(initialData.code || '');
      setAcademicYear(initialData.academicYear || '2026-2027');
      setSemester(initialData.semester || '1st Semester');
      setYearLevel(initialData.yearLevel || '1st Year');
    } else {
      setName('');
      setCode('');
      setAcademicYear('2026-2027');
      setSemester('1st Semester');
      setYearLevel('1st Year');
    }
    setError('');
  }, [initialData, mode, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Subject Name is required.');
      return;
    }
    if (!code.trim()) {
      setError('Course Code is required (e.g., CS101, SEC201).');
      return;
    }
    setError('');
    setLoading(true);
    const success = await onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      academicYear,
      semester,
      yearLevel,
    });
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {mode === 'edit' ? 'Edit Course Subject' : 'Initialize New Subject'}
              </Text>
              <Text style={styles.subtitle}>
                Configure official course identification, academic calendar, and student cohort level.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Course Identity */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Course Identification</Text>
            </View>

            <Input
              label="Subject Title"
              placeholder="e.g., Introduction to Computer Science"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Course Code"
              placeholder="e.g., CS101, SEC201"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />

            {/* Academic Scheduling */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Academic Placement</Text>
            </View>

            {/* Academic Year Dropdown */}
            <Text style={styles.fieldLabel}>Academic Year</Text>
            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setShowYearDropdown(!showYearDropdown)}
            >
              <Text style={styles.dropdownTriggerText}>{academicYear}</Text>
              <Text style={styles.dropdownCaret}>{showYearDropdown ? '▲' : '▼'}</Text>
            </Pressable>
            {showYearDropdown && (
              <View style={styles.dropdownMenu}>
                {ACADEMIC_YEARS.map(yr => (
                  <Pressable
                    key={yr}
                    style={[styles.dropdownItem, academicYear === yr && styles.dropdownItemActive]}
                    onPress={() => {
                      setAcademicYear(yr);
                      setShowYearDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, academicYear === yr && styles.dropdownItemTextActive]}>
                      {yr}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Semester Dropdown (1st, 2nd, 3rd only) */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Semester</Text>
            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setShowSemesterDropdown(!showSemesterDropdown)}
            >
              <Text style={styles.dropdownTriggerText}>{semester}</Text>
              <Text style={styles.dropdownCaret}>{showSemesterDropdown ? '▲' : '▼'}</Text>
            </Pressable>
            {showSemesterDropdown && (
              <View style={styles.dropdownMenu}>
                {SEMESTERS.map(sem => (
                  <Pressable
                    key={sem}
                    style={[styles.dropdownItem, semester === sem && styles.dropdownItemActive]}
                    onPress={() => {
                      setSemester(sem);
                      setShowSemesterDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, semester === sem && styles.dropdownItemTextActive]}>
                      {sem}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Year Level Dropdown */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Year Level</Text>
            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setShowYearLevelDropdown(!showYearLevelDropdown)}
            >
              <Text style={styles.dropdownTriggerText}>{yearLevel}</Text>
              <Text style={styles.dropdownCaret}>{showYearLevelDropdown ? '▲' : '▼'}</Text>
            </Pressable>
            {showYearLevelDropdown && (
              <View style={styles.dropdownMenu}>
                {YEAR_LEVELS.map(lvl => (
                  <Pressable
                    key={lvl}
                    style={[styles.dropdownItem, yearLevel === lvl && styles.dropdownItemActive]}
                    onPress={() => {
                      setYearLevel(lvl);
                      setShowYearLevelDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, yearLevel === lvl && styles.dropdownItemTextActive]}>
                      {lvl}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={styles.cancelBtn}
            />
            <Button
              title={mode === 'edit' ? 'Update Subject' : 'Create Subject'}
              variant="primary"
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  closeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  body: {
    padding: 20,
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  dropdownCaret: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  dropdownItemActive: {
    backgroundColor: '#FDEDEC',
  },
  dropdownItemText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
  },
  submitBtn: {
    paddingHorizontal: 20,
  },
});
