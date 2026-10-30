import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  chairApi,
  ChairAccount,
  ChairStats,
  ChairSubject,
  ChairReportsData,
  SmartEnrollmentPreview,
} from '@/services/chairApi';
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';

type ChairTab = 'dashboard' | 'reports' | 'accounts' | 'enrollment';

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEMESTERS = ['1st Semester', '2nd Semester', '3rd Semester'];
const SCHOOL_YEARS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];
const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty Instructor' },
  { value: 'program_chair', label: 'Program Chair' },
  { value: 'admin', label: 'Administrator' },
];

export default function ChairDashboardScreen() {
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // Role Gate: strictly Program Chair or Admin
  useEffect(() => {
    if (user) {
      const r = user.role;
      if (r !== 'program chair' && r !== 'program_chair' && r !== 'admin') {
        if (r === 'faculty') {
          router.replace('/faculty/dashboard' as any);
        } else {
          router.replace('/student/dashboard' as any);
        }
      }
    }
  }, [user]);

  // Layout & Navigation State
  const [activeTab, setActiveTab] = useState<ChairTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data States
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChairAccount[]>([]);
  const [subjects, setSubjects] = useState<ChairSubject[]>([]);
  const [reportsData, setReportsData] = useState<ChairReportsData | null>(null);
  const [stats, setStats] = useState<ChairStats>({
    totalUsers: 0,
    studentCount: 0,
    facultyCount: 0,
    chairCount: 0,
  });

  // Global Filters (Per Subject, Per Year, Per Sem, Per SY, Per Role, Search)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterYearLevel, setFilterYearLevel] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterSchoolYear, setFilterSchoolYear] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDirectEnrollModal, setShowDirectEnrollModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Form state: Create Account
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'faculty' | 'program_chair'>('student');
  const [newYearLevel, setNewYearLevel] = useState('1st Year');
  const [newSemester, setNewSemester] = useState('1st Semester');
  const [newSchoolYear, setNewSchoolYear] = useState('2026-2027');

  // Form state: Edit Account & Role (Replaces cycle role)
  const [editingAccount, setEditingAccount] = useState<ChairAccount | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<string>('student');
  const [editYearLevel, setEditYearLevel] = useState('1st Year');
  const [editSemester, setEditSemester] = useState('1st Semester');
  const [editSchoolYear, setEditSchoolYear] = useState('2026-2027');

  // Direct Student Enrollment Modal State
  const [enrollTargetStudent, setEnrollTargetStudent] = useState<ChairAccount | null>(null);
  const [selectedSubjectToEnroll, setSelectedSubjectToEnroll] = useState<string>('');

  // Batch Status Update State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchYearLevel, setBatchYearLevel] = useState('1st Year');
  const [batchSemester, setBatchSemester] = useState('1st Semester');
  const [batchSchoolYear, setBatchSchoolYear] = useState('2026-2027');

  // Smart Enrollment Engine
  const [enrollCriteriaYear, setEnrollCriteriaYear] = useState('1st Year');
  const [enrollCriteriaSem, setEnrollCriteriaSem] = useState('1st Semester');
  const [enrollCriteriaSY, setEnrollCriteriaSY] = useState('2026-2027');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SmartEnrollmentPreview | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Initial Data Load
  useEffect(() => {
    loadSubjects();
    loadAccounts();
    loadReports();
  }, [token]);

  // Reload filtered accounts when filter values change
  useEffect(() => {
    loadAccounts();
  }, [token, filterRole, filterSubjectId, filterYearLevel, filterSemester, filterSchoolYear]);

  const loadSubjects = async () => {
    const res = await chairApi.getAllSubjects(token);
    if (res.success && res.data) {
      setSubjects(res.data);
    }
  };

  const loadAccounts = async () => {
    setLoading(true);
    const res = await chairApi.getAccounts(token, {
      search: searchTerm,
      role: filterRole,
      subjectId: filterSubjectId,
      yearLevel: filterYearLevel,
      semester: filterSemester,
      schoolYear: filterSchoolYear,
    });

    if (res.success && res.data) {
      setAccounts(res.data.accounts);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    }
    setLoading(false);
  };

  const loadReports = async () => {
    const res = await chairApi.getChairReports(token, {
      subjectId: filterSubjectId,
      yearLevel: filterYearLevel,
      semester: filterSemester,
      schoolYear: filterSchoolYear,
    });
    if (res.success && res.data) {
      setReportsData(res.data);
    }
  };

  // ─── ACCOUNT ACTIONS ─────────────────────────────────────────

  const handleOpenEditModal = (acc: ChairAccount) => {
    setEditingAccount(acc);
    setEditFirstName(acc.firstName);
    setEditLastName(acc.lastName);
    setEditEmail(acc.email);
    setEditUsername(acc.username);
    setEditRole(acc.role === 'program chair' ? 'program_chair' : acc.role);
    setEditYearLevel(acc.yearLevel || '1st Year');
    setEditSemester(acc.activeSemester || '1st Semester');
    setEditSchoolYear(acc.schoolYear || '2026-2027');
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleSaveEditAccount = async () => {
    if (!editingAccount) return;
    setActionLoading(true);
    setErrorMsg('');

    const res = await chairApi.updateAccount(token, editingAccount._id, {
      firstName: editFirstName,
      lastName: editLastName,
      email: editEmail,
      username: editUsername,
      role: editRole as any,
      yearLevel: editRole === 'student' ? editYearLevel : undefined,
      activeSemester: editRole === 'student' ? editSemester : undefined,
      schoolYear: editRole === 'student' ? editSchoolYear : undefined,
    });

    setActionLoading(false);
    if (res.success) {
      setShowEditModal(false);
      setEditingAccount(null);
      loadAccounts();
    } else {
      setErrorMsg(res.message || 'Failed to update user account and role.');
    }
  };

  const handleCreateAccount = async () => {
    if (!newFirstName || !newLastName || !newEmail || !newUsername || !newPassword) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');

    const res = await chairApi.createAccount(token, {
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      username: newUsername,
      password: newPassword,
      role: newRole,
      yearLevel: newRole === 'student' ? newYearLevel : undefined,
      activeSemester: newRole === 'student' ? newSemester : undefined,
      schoolYear: newRole === 'student' ? newSchoolYear : undefined,
    });

    setActionLoading(false);
    if (res.success) {
      setShowCreateModal(false);
      resetCreateForm();
      loadAccounts();
    } else {
      setErrorMsg(res.message || 'Failed to provision account.');
    }
  };

  const resetCreateForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('student');
    setNewYearLevel('1st Year');
    setNewSemester('1st Semester');
    setNewSchoolYear('2026-2027');
    setErrorMsg('');
  };

  const handleDeleteAccount = (acc: ChairAccount) => {
    if (typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to delete ${acc.firstName} ${acc.lastName}? This permanently removes all academic records and enrollments.`)) {
        chairApi.deleteAccount(token, acc._id).then(res => {
          if (res.success) loadAccounts();
          else alert(res.message || 'Deletion failed.');
        });
      }
    }
  };

  // ─── DIRECT STUDENT ENROLLMENT HANDLERS ──────────────────────

  const handleOpenDirectEnroll = (stu: ChairAccount) => {
    setEnrollTargetStudent(stu);
    setSelectedSubjectToEnroll(subjects[0]?.id || '');
    setFeedbackMsg('');
    setShowDirectEnrollModal(true);
  };

  const handleExecuteDirectEnroll = async () => {
    if (!enrollTargetStudent || !selectedSubjectToEnroll) return;
    setActionLoading(true);
    const res = await chairApi.enrollStudentDirect(token, enrollTargetStudent._id, selectedSubjectToEnroll);
    setActionLoading(false);

    if (res.success) {
      setFeedbackMsg(res.message || 'Student enrolled successfully.');
      loadAccounts();
      loadSubjects();
      setTimeout(() => setShowDirectEnrollModal(false), 1500);
    } else {
      Alert.alert('Enrollment Error', res.message || 'Could not enroll student in subject.');
    }
  };

  const handleUnenrollDirect = async (studentId: string, subjectId: string) => {
    if (typeof window !== 'undefined') {
      if (window.confirm('Are you sure you want to unenroll this student from this course? Coursework will be locked.')) {
        const res = await chairApi.unenrollStudentDirect(token, studentId, subjectId);
        if (res.success) {
          loadAccounts();
          loadSubjects();
        } else {
          alert(res.message || 'Failed to unenroll.');
        }
      }
    }
  };

  // ─── BATCH & SMART ENROLLMENT ────────────────────────────────

  const handleToggleSelectStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(s => s !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleBatchUpdateStatus = async () => {
    if (selectedStudentIds.length === 0) return;
    setActionLoading(true);
    const res = await chairApi.batchUpdateStudentStatus(token, {
      studentIds: selectedStudentIds,
      yearLevel: batchYearLevel,
      activeSemester: batchSemester,
      schoolYear: batchSchoolYear,
    });
    setActionLoading(false);
    if (res.success) {
      setShowBatchModal(false);
      setSelectedStudentIds([]);
      loadAccounts();
    } else {
      Alert.alert('Batch Update Failed', res.message || 'Could not update cohorts.');
    }
  };

  const handlePreviewEnrollment = async () => {
    setPreviewLoading(true);
    setFeedbackMsg('');
    const res = await chairApi.previewEnrollmentRules(token, {
      yearLevel: enrollCriteriaYear,
      activeSemester: enrollCriteriaSem,
      schoolYear: enrollCriteriaSY,
    });
    setPreviewLoading(false);
    if (res.success && res.data) {
      setPreviewData(res.data);
    } else {
      setFeedbackMsg(res.message || 'Failed to simulate matching.');
    }
  };

  const handleExecuteSmartEnrollment = async () => {
    if (!previewData) return;
    setActionLoading(true);
    setFeedbackMsg('');
    const res = await chairApi.executeEnrollmentRules(token, {
      yearLevel: enrollCriteriaYear,
      activeSemester: enrollCriteriaSem,
      schoolYear: enrollCriteriaSY,
    });
    setActionLoading(false);
    if (res.success) {
      setFeedbackMsg(`Enrollment completed! ${res.data?.enrolledRecordsCount || 0} student-subject records committed.`);
      setPreviewData(null);
      loadAccounts();
      loadSubjects();
    } else {
      setFeedbackMsg(res.message || 'Enrollment execution failed.');
    }
  };

  // Get current logged-in role label directly from user state
  const currentUserRole = user?.role || 'program_chair';
  const displayRoleLabel =
    currentUserRole === 'program chair' || currentUserRole === 'program_chair'
      ? 'PROGRAM CHAIR'
      : currentUserRole === 'admin'
      ? 'ADMINISTRATOR'
      : currentUserRole === 'faculty'
      ? 'FACULTY'
      : 'STUDENT';

  // Navigation Items
  const NAV_ITEMS: { id: ChairTab; label: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'Reports' },
    { id: 'accounts', label: 'Accounts', badge: stats.totalUsers },
    { id: 'enrollment', label: 'Enrollment' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ─── TOP GLOBAL BAR ───────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {/* Hamburger toggle for mobile */}
          {!isDesktop && (
            <Pressable style={styles.hamburgerBtn} onPress={() => setMobileMenuOpen(prev => !prev)}>
              <Text style={styles.hamburgerIcon}>☰</Text>
            </Pressable>
          )}
          <View>
            <Text style={styles.appTitle}>Academic Command Center</Text>
            <Text style={styles.appSubTitle}>Institutional Administration & Enrollment</Text>
          </View>
        </View>

        {/* Identity Badge: Directly specifies role from DB user object */}
        <View style={styles.topBarRight}>
          <View style={styles.roleIdentityCard}>
            <Text style={styles.roleIdentityPrefix}>LOGGED IN AS:</Text>
            <View style={styles.roleIdentityPill}>
              <Text style={styles.roleIdentityPillText}>{displayRoleLabel}</Text>
            </View>
            <Text style={styles.roleIdentityName}>
              {user?.firstName} {user?.lastName}
            </Text>
          </View>

          <Button
            title="+ Provision Account"
            variant="primary"
            size="sm"
            onPress={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
          />
        </View>
      </View>

      {/* ─── MAIN SHELL: SIDEBAR + CONTENT ────────────────────────── */}
      <View style={styles.mainShell}>
        {/* Desktop Sidebar OR Mobile Drawer Modal */}
        {(isDesktop || mobileMenuOpen) && (
          <View style={isDesktop ? styles.sidebarDesktop : styles.sidebarMobileDrawer}>
            {!isDesktop && (
              <View style={styles.mobileDrawerHeader}>
                <Text style={styles.drawerTitle}>Navigation Menu</Text>
                <Pressable onPress={() => setMobileMenuOpen(false)}>
                  <Text style={styles.closeDrawerText}>✕</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.sidebarUserCard}>
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sidebarUserName}>{user?.firstName} {user?.lastName}</Text>
                <Text style={styles.sidebarUserEmail} numberOfLines={1}>{user?.email}</Text>
                <View style={styles.sidebarRoleTag}>
                  <Text style={styles.sidebarRoleTagText}>{displayRoleLabel}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sidebarDivider} />

            {/* Navigation Tabs */}
            <View style={styles.navMenu}>
              {NAV_ITEMS.map(item => (
                <Pressable
                  key={item.id}
                  style={[styles.navItem, activeTab === item.id && styles.navItemActive]}
                  onPress={() => {
                    setActiveTab(item.id);
                    if (!isDesktop) setMobileMenuOpen(false);
                    if (item.id === 'reports') loadReports();
                  }}
                >
                  <Text style={[styles.navItemText, activeTab === item.id && styles.navItemTextActive]}>
                    {item.label}
                  </Text>
                  {item.badge !== undefined && (
                    <View style={[styles.navBadge, activeTab === item.id && styles.navBadgeActive]}>
                      <Text style={[styles.navBadgeText, activeTab === item.id && styles.navBadgeTextActive]}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.sidebarFooter}>
              <Pressable style={styles.portalSwitchBtn} onPress={() => router.push('/faculty/dashboard' as any)}>
                <Text style={styles.portalSwitchText}>Open Faculty Studio →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── PRIMARY WORKSPACE AREA ─────────────────────────────── */}
        <ScrollView style={styles.workspace} contentContainerStyle={styles.workspaceBody} showsVerticalScrollIndicator={false}>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 1: DASHBOARD OVERVIEW ════════════════════════════════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <View>
              {/* Metric Stat Cards */}
              <View style={styles.statsGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>TOTAL ACCOUNTS</Text>
                  <Text style={styles.kpiValue}>{stats.totalUsers}</Text>
                  <Text style={styles.kpiSub}>Registered institutional users</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiLabel, { color: '#27AE60' }]}>ACTIVE STUDENTS</Text>
                  <Text style={[styles.kpiValue, { color: '#27AE60' }]}>{stats.studentCount}</Text>
                  <Text style={styles.kpiSub}>Eligible for course enrollment</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiLabel, { color: '#2980B9' }]}>FACULTY INSTRUCTORS</Text>
                  <Text style={[styles.kpiValue, { color: '#2980B9' }]}>{stats.facultyCount}</Text>
                  <Text style={styles.kpiSub}>Curriculum & topic authors</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiLabel, { color: COLORS.primary }]}>PROGRAM CHAIRS</Text>
                  <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{stats.chairCount}</Text>
                  <Text style={styles.kpiSub}>Administrative controllers</Text>
                </View>
              </View>

              {/* Quick Actions & Curriculum Summary */}
              <View style={styles.dashboardSection}>
                <Text style={styles.sectionHeading}>Curriculum Tracks & Enrolled Courses</Text>
                <View style={styles.curriculumGrid}>
                  {subjects.map(s => (
                    <View key={s.id} style={styles.curriculumCard}>
                      <View style={styles.curriculumTop}>
                        <View style={styles.courseCodeBadge}>
                          <Text style={styles.courseCodeText}>{s.code}</Text>
                        </View>
                        <View style={styles.enrollPill}>
                          <Text style={styles.enrollPillText}>{s.enrolledCount} Enrolled</Text>
                        </View>
                      </View>
                      <Text style={styles.curriculumName}>{s.name}</Text>
                      <Text style={styles.curriculumFaculty}>Instructor: {s.facultyName}</Text>
                      <Text style={styles.curriculumMeta}>
                        {s.yearLevel} • {s.semester} • {s.academicYear}
                      </Text>
                      <View style={styles.curriculumActions}>
                        <Button
                          title="Manage Enrollments"
                          variant="secondary"
                          size="sm"
                          onPress={() => {
                            setFilterSubjectId(s.id);
                            setActiveTab('accounts');
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 2: COMPREHENSIVE REPORTS ═════════════════════════════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelTitle}>Academic & Cohort Analytics Reports</Text>
                  <Text style={styles.panelSub}>
                    Course completion rates, topic progression, and assessment passing benchmarks.
                  </Text>
                </View>
              </View>

              {/* Global Filters: Subject, Year Level, Semester, SY */}
              <View style={styles.filtersBar}>
                <View style={styles.filterItem}>
                  <Text style={styles.filterTitle}>Subject Filter:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <Pressable
                      style={[styles.filterChip, filterSubjectId === 'all' && styles.filterChipActive]}
                      onPress={() => { setFilterSubjectId('all'); loadReports(); }}
                    >
                      <Text style={[styles.filterChipText, filterSubjectId === 'all' && styles.filterChipTextActive]}>
                        All Subjects
                      </Text>
                    </Pressable>
                    {subjects.map(s => (
                      <Pressable
                        key={s.id}
                        style={[styles.filterChip, filterSubjectId === s.id && styles.filterChipActive]}
                        onPress={() => { setFilterSubjectId(s.id); loadReports(); }}
                      >
                        <Text style={[styles.filterChipText, filterSubjectId === s.id && styles.filterChipTextActive]}>
                          {s.code}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.filterRow}>
                  <View style={styles.filterItem}>
                    <Text style={styles.filterTitle}>Year Level:</Text>
                    <View style={styles.chipRow}>
                      {['all', ...YEAR_LEVELS].map(y => (
                        <Pressable
                          key={y}
                          style={[styles.filterChip, filterYearLevel === y && styles.filterChipActive]}
                          onPress={() => { setFilterYearLevel(y); loadReports(); }}
                        >
                          <Text style={[styles.filterChipText, filterYearLevel === y && styles.filterChipTextActive]}>
                            {y === 'all' ? 'All Years' : y}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.filterItem}>
                    <Text style={styles.filterTitle}>Semester:</Text>
                    <View style={styles.chipRow}>
                      {['all', ...SEMESTERS].map(s => (
                        <Pressable
                          key={s}
                          style={[styles.filterChip, filterSemester === s && styles.filterChipActive]}
                          onPress={() => { setFilterSemester(s); loadReports(); }}
                        >
                          <Text style={[styles.filterChipText, filterSemester === s && styles.filterChipTextActive]}>
                            {s === 'all' ? 'All Terms' : s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Reports Table */}
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colHeader, { flex: 1.5 }]}>COURSE CODE</Text>
                  <Text style={[styles.colHeader, { flex: 2.5 }]}>SUBJECT TITLE</Text>
                  <Text style={[styles.colHeader, { flex: 2 }]}>INSTRUCTOR</Text>
                  <Text style={[styles.colHeader, { flex: 1.5 }]}>COHORT</Text>
                  <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'center' }]}>ENROLLED</Text>
                  <Text style={[styles.colHeader, { flex: 2 }]}>AVG PROGRESS</Text>
                  <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'center' }]}>COMPLETED</Text>
                </View>

                {(!reportsData?.subjectReports || reportsData.subjectReports.length === 0) ? (
                  <View style={styles.emptyTable}>
                    <Text style={styles.emptyTableText}>No subject reports found matching the criteria.</Text>
                  </View>
                ) : (
                  reportsData.subjectReports.map((rep, idx) => (
                    <View key={rep.subjectId} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.cellCodeText}>{rep.code}</Text>
                      </View>
                      <View style={{ flex: 2.5 }}>
                        <Text style={styles.cellPrimary}>{rep.name}</Text>
                        <Text style={styles.cellSub}>{rep.publishedTopicsCount} published topics</Text>
                      </View>
                      <Text style={[styles.cellText, { flex: 2 }]}>{rep.faculty}</Text>
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.cellCohortText}>{rep.yearLevel} • {rep.semester}</Text>
                      </View>
                      <View style={{ flex: 1.5, alignItems: 'center' }}>
                        <View style={styles.enrollBadge}>
                          <Text style={styles.enrollBadgeText}>{rep.enrolledCount}</Text>
                        </View>
                      </View>
                      <View style={{ flex: 2 }}>
                        <View style={styles.progressRow}>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${rep.averageProgressPercent}%` }]} />
                          </View>
                          <Text style={styles.progressText}>{rep.averageProgressPercent}%</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1.5, alignItems: 'center' }}>
                        <Text style={styles.completedCountText}>{rep.completedStudentsCount}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 3: ACCOUNTS LIFECYCLE MANAGER ════════════════════════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'accounts' && (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelTitle}>Account Lifecycle Manager</Text>
                  <Text style={styles.panelSub}>
                    Search, filter, update credentials, edit roles, and assign course enrollments.
                  </Text>
                </View>
                <View style={styles.headerBtnGroup}>
                  {selectedStudentIds.length > 0 && (
                    <Button
                      title={`Batch Status (${selectedStudentIds.length})`}
                      variant="primary"
                      size="sm"
                      onPress={() => setShowBatchModal(true)}
                    />
                  )}
                </View>
              </View>

              {/* Multi-Criteria Filters Bar */}
              <View style={styles.filtersBar}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, email, or username..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  onSubmitEditing={loadAccounts}
                />

                {/* Filter per Subject */}
                <View style={styles.filterItem}>
                  <Text style={styles.filterTitle}>Filter by Subject:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <Pressable
                      style={[styles.filterChip, filterSubjectId === 'all' && styles.filterChipActive]}
                      onPress={() => setFilterSubjectId('all')}
                    >
                      <Text style={[styles.filterChipText, filterSubjectId === 'all' && styles.filterChipTextActive]}>
                        All Subjects
                      </Text>
                    </Pressable>
                    {subjects.map(s => (
                      <Pressable
                        key={s.id}
                        style={[styles.filterChip, filterSubjectId === s.id && styles.filterChipActive]}
                        onPress={() => setFilterSubjectId(s.id)}
                      >
                        <Text style={[styles.filterChipText, filterSubjectId === s.id && styles.filterChipTextActive]}>
                          {s.code}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Filter per Role */}
                <View style={styles.filterRow}>
                  <View style={styles.filterItem}>
                    <Text style={styles.filterTitle}>Role Privilege:</Text>
                    <View style={styles.chipRow}>
                      {['all', 'student', 'faculty', 'program_chair', 'admin'].map(r => (
                        <Pressable
                          key={r}
                          style={[styles.filterChip, filterRole === r && styles.filterChipActive]}
                          onPress={() => setFilterRole(r)}
                        >
                          <Text style={[styles.filterChipText, filterRole === r && styles.filterChipTextActive]}>
                            {r === 'all' ? 'All Roles' : r === 'program_chair' ? 'Chair' : r.toUpperCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Filter per Year Level */}
                  <View style={styles.filterItem}>
                    <Text style={styles.filterTitle}>Year Level:</Text>
                    <View style={styles.chipRow}>
                      {['all', ...YEAR_LEVELS].map(y => (
                        <Pressable
                          key={y}
                          style={[styles.filterChip, filterYearLevel === y && styles.filterChipActive]}
                          onPress={() => setFilterYearLevel(y)}
                        >
                          <Text style={[styles.filterChipText, filterYearLevel === y && styles.filterChipTextActive]}>
                            {y === 'all' ? 'All' : y}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Filter per Semester */}
                  <View style={styles.filterItem}>
                    <Text style={styles.filterTitle}>Semester:</Text>
                    <View style={styles.chipRow}>
                      {['all', ...SEMESTERS].map(s => (
                        <Pressable
                          key={s}
                          style={[styles.filterChip, filterSemester === s && styles.filterChipActive]}
                          onPress={() => setFilterSemester(s)}
                        >
                          <Text style={[styles.filterChipText, filterSemester === s && styles.filterChipTextActive]}>
                            {s === 'all' ? 'All' : s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Accounts Data Table */}
              {loading ? (
                <View style={styles.loadingPad}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Retrieving directory records...</Text>
                </View>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.colHeader, { flex: 2.2 }]}>USER / IDENTITY</Text>
                    <Text style={[styles.colHeader, { flex: 2.5 }]}>EMAIL & USERNAME</Text>
                    <Text style={[styles.colHeader, { flex: 1.8 }]}>ROLE PRIVILEGE</Text>
                    <Text style={[styles.colHeader, { flex: 2 }]}>ACADEMIC COHORT</Text>
                    <Text style={[styles.colHeader, { flex: 2.5 }]}>ENROLLED SUBJECTS</Text>
                    <Text style={[styles.colHeader, { flex: 2.5, textAlign: 'right' }]}>ACTIONS</Text>
                  </View>

                  {accounts.length === 0 ? (
                    <View style={styles.emptyTable}>
                      <Text style={styles.emptyTableText}>No accounts found matching the filter criteria.</Text>
                    </View>
                  ) : (
                    accounts.map((acc, idx) => (
                      <View key={acc._id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                        <View style={{ flex: 2.2 }}>
                          <Text style={styles.cellPrimary}>{acc.firstName} {acc.lastName}</Text>
                          <Text style={styles.cellSub}>ID: {acc._id.slice(-6).toUpperCase()}</Text>
                        </View>

                        <View style={{ flex: 2.5 }}>
                          <Text style={styles.cellText} numberOfLines={1}>{acc.email}</Text>
                          <Text style={styles.cellSub}>@{acc.username}</Text>
                        </View>

                        <View style={{ flex: 1.8 }}>
                          <View style={[
                            styles.roleBadge,
                            acc.role === 'student' ? styles.badgeStudent :
                            acc.role === 'faculty' ? styles.badgeFaculty : styles.badgeChair
                          ]}>
                            <Text style={[
                              styles.roleBadgeText,
                              acc.role === 'student' ? styles.badgeTextStudent :
                              acc.role === 'faculty' ? styles.badgeTextFaculty : styles.badgeTextChair
                            ]}>
                              {acc.role === 'program chair' || acc.role === 'program_chair' ? 'CHAIR' : acc.role.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flex: 2 }}>
                          {acc.role === 'student' ? (
                            <Text style={styles.cellCohortText}>
                              {acc.yearLevel || '1st Year'} • {acc.activeSemester || '1st Sem'}
                            </Text>
                          ) : (
                            <Text style={styles.cellMuted}>Academic Staff</Text>
                          )}
                        </View>

                        {/* Enrolled Subjects List & Direct Enroll Trigger */}
                        <View style={{ flex: 2.5 }}>
                          {acc.role === 'student' ? (
                            <View style={styles.enrolledListRow}>
                              {acc.enrolledSubjects && acc.enrolledSubjects.length > 0 ? (
                                acc.enrolledSubjects.map((s, i) => (
                                  <Pressable
                                    key={i}
                                    style={styles.enrolledChip}
                                    onPress={() => s.id && handleUnenrollDirect(acc._id, s.id)}
                                  >
                                    <Text style={styles.enrolledChipText}>{s.code} ✕</Text>
                                  </Pressable>
                                ))
                              ) : (
                                <Text style={styles.unassignedText}>No subjects enrolled</Text>
                              )}
                              <Pressable style={styles.addEnrollBtn} onPress={() => handleOpenDirectEnroll(acc)}>
                                <Text style={styles.addEnrollText}>+ Enroll</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Text style={styles.cellMuted}>N/A (Staff)</Text>
                          )}
                        </View>

                        {/* Actions: Edit Account / Role & Delete (NO cycle button!) */}
                        <View style={[styles.actionsCell, { flex: 2.5 }]}>
                          <Pressable style={styles.editBtn} onPress={() => handleOpenEditModal(acc)}>
                            <Text style={styles.editBtnText}>Edit Role / User</Text>
                          </Pressable>
                          <Pressable style={styles.deleteBtn} onPress={() => handleDeleteAccount(acc)}>
                            <Text style={styles.deleteBtnText}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 4: ENROLLMENT ENGINE ═════════════════════════════════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'enrollment' && (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelTitle}>Curriculum Enrollment Engine</Text>
                  <Text style={styles.panelSub}>
                    Enroll students into specific curriculum subjects before they can access course materials.
                  </Text>
                </View>
              </View>

              {feedbackMsg ? (
                <View style={[styles.noticeBanner, feedbackMsg.includes('failed') ? styles.noticeError : styles.noticeSuccess]}>
                  <Text style={styles.noticeText}>{feedbackMsg}</Text>
                </View>
              ) : null}

              {/* Step 1: Cohort Matching Criteria */}
              <View style={styles.engineConfigCard}>
                <Text style={styles.cardSectionTitle}>STEP 1: SELECT COHORT CRITERIA TO ENROLL</Text>
                <View style={styles.criteriaGrid}>
                  <View style={styles.criteriaField}>
                    <Text style={styles.fieldLabel}>Target Year Level:</Text>
                    <View style={styles.chipRow}>
                      {YEAR_LEVELS.map(y => (
                        <Pressable
                          key={y}
                          style={[styles.filterChip, enrollCriteriaYear === y && styles.filterChipActive]}
                          onPress={() => setEnrollCriteriaYear(y)}
                        >
                          <Text style={[styles.filterChipText, enrollCriteriaYear === y && styles.filterChipTextActive]}>{y}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.criteriaField}>
                    <Text style={styles.fieldLabel}>Active Term / Semester:</Text>
                    <View style={styles.chipRow}>
                      {SEMESTERS.map(s => (
                        <Pressable
                          key={s}
                          style={[styles.filterChip, enrollCriteriaSem === s && styles.filterChipActive]}
                          onPress={() => setEnrollCriteriaSem(s)}
                        >
                          <Text style={[styles.filterChipText, enrollCriteriaSem === s && styles.filterChipTextActive]}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.criteriaField}>
                    <Text style={styles.fieldLabel}>School Year:</Text>
                    <View style={styles.chipRow}>
                      {SCHOOL_YEARS.map(sy => (
                        <Pressable
                          key={sy}
                          style={[styles.filterChip, enrollCriteriaSY === sy && styles.filterChipActive]}
                          onPress={() => setEnrollCriteriaSY(sy)}
                        >
                          <Text style={[styles.filterChipText, enrollCriteriaSY === sy && styles.filterChipTextActive]}>{sy}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 18 }}>
                  <Button
                    title={previewLoading ? 'Simulating Matches...' : 'Run Enrollment Simulation'}
                    variant="primary"
                    size="md"
                    loading={previewLoading}
                    onPress={handlePreviewEnrollment}
                  />
                </View>
              </View>

              {/* Step 2: Simulation Preview */}
              {previewData && (
                <View style={styles.simulationCard}>
                  <Text style={styles.cardSectionTitle}>STEP 2: ENROLLMENT MATCHING MATRIX</Text>
                  <View style={styles.matrixMetrics}>
                    <View style={styles.matrixPill}>
                      <Text style={styles.matrixPillVal}>{previewData.matchedStudentsCount}</Text>
                      <Text style={styles.matrixPillLabel}>Matching Students</Text>
                    </View>
                    <View style={styles.matrixPill}>
                      <Text style={styles.matrixPillVal}>{previewData.matchedSubjectsCount}</Text>
                      <Text style={styles.matrixPillLabel}>Matching Subjects</Text>
                    </View>
                    <View style={[styles.matrixPill, { backgroundColor: '#E8F8F5' }]}>
                      <Text style={[styles.matrixPillVal, { color: '#27AE60' }]}>{previewData.potentialEnrollmentCount}</Text>
                      <Text style={styles.matrixPillLabel}>New Access Grants</Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.fieldLabel}>Subjects in Cohort:</Text>
                    <View style={styles.chipRow}>
                      {previewData.matchingSubjects.map(s => (
                        <View key={s.id} style={styles.subjectGrantTag}>
                          <Text style={styles.subjectGrantCode}>{s.code}</Text>
                          <Text style={styles.subjectGrantName}>{s.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.executeRow}>
                    <Text style={styles.executeNotice}>
                      Executing will grant access to all {previewData.matchedStudentsCount} students for these curriculum subjects. Students cannot view or access subjects until enrolled.
                    </Text>
                    <Button
                      title={actionLoading ? 'Committing...' : 'Confirm & Execute Enrollment'}
                      variant="primary"
                      size="lg"
                      loading={actionLoading}
                      disabled={previewData.potentialEnrollmentCount === 0}
                      onPress={handleExecuteSmartEnrollment}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </View>

      {/* ─── MODAL: EDIT USER & ROLE (Replaces Cycle Role) ───────── */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User Account & Role</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {errorMsg ? (
              <View style={styles.errorNotice}>
                <Text style={styles.errorNoticeText}>{errorMsg}</Text>
              </View>
            ) : null}

            <ScrollView style={styles.modalForm}>
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>First Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                  />
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Last Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editLastName}
                    onChangeText={setEditLastName}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Email Address</Text>
                <TextInput
                  style={styles.formInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  autoCapitalize="none"
                />
              </View>

              {/* Explicit Role Selection (Student, Faculty, Chair, Admin) */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>System Role & Privilege</Text>
                <View style={styles.chipRow}>
                  {ROLES.map(r => (
                    <Pressable
                      key={r.value}
                      style={[styles.filterChip, editRole === r.value && styles.filterChipActive]}
                      onPress={() => setEditRole(r.value)}
                    >
                      <Text style={[styles.filterChipText, editRole === r.value && styles.filterChipTextActive]}>
                        {r.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {editRole === 'student' && (
                <View style={styles.formRow}>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Year Level</Text>
                    {YEAR_LEVELS.map(y => (
                      <Pressable
                        key={y}
                        style={[styles.filterChip, editYearLevel === y && styles.filterChipActive, { marginBottom: 4 }]}
                        onPress={() => setEditYearLevel(y)}
                      >
                        <Text style={[styles.filterChipText, editYearLevel === y && styles.filterChipTextActive]}>{y}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Active Semester</Text>
                    {SEMESTERS.map(s => (
                      <Pressable
                        key={s}
                        style={[styles.filterChip, editSemester === s && styles.filterChipActive, { marginBottom: 4 }]}
                        onPress={() => setEditSemester(s)}
                      >
                        <Text style={[styles.filterChipText, editSemester === s && styles.filterChipTextActive]}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="secondary" size="md" onPress={() => setShowEditModal(false)} />
              <Button
                title={actionLoading ? 'Saving...' : 'Save User & Role'}
                variant="primary"
                size="md"
                loading={actionLoading}
                onPress={handleSaveEditAccount}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: DIRECT STUDENT TO SUBJECT ENROLLMENT ───────── */}
      <Modal visible={showDirectEnrollModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enroll Student to Subject</Text>
              <Pressable onPress={() => setShowDirectEnrollModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.enrollModalSub}>
              Granting coursework access for: <Text style={{ fontWeight: '800' }}>{enrollTargetStudent?.firstName} {enrollTargetStudent?.lastName}</Text> ({enrollTargetStudent?.email})
            </Text>

            {feedbackMsg ? (
              <View style={[styles.noticeBanner, styles.noticeSuccess]}>
                <Text style={styles.noticeText}>{feedbackMsg}</Text>
              </View>
            ) : null}

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Select Subject to Enroll:</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                {subjects.map(s => (
                  <Pressable
                    key={s.id}
                    style={[styles.subjectOptionCard, selectedSubjectToEnroll === s.id && styles.subjectOptionCardActive]}
                    onPress={() => setSelectedSubjectToEnroll(s.id)}
                  >
                    <View style={styles.courseCodeBadge}>
                      <Text style={styles.courseCodeText}>{s.code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectOptionName}>{s.name}</Text>
                      <Text style={styles.subjectOptionMeta}>
                        Instructor: {s.facultyName} • {s.yearLevel} ({s.semester})
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="secondary" size="md" onPress={() => setShowDirectEnrollModal(false)} />
              <Button
                title={actionLoading ? 'Enrolling...' : 'Grant Access & Enroll'}
                variant="primary"
                size="md"
                loading={actionLoading}
                onPress={handleExecuteDirectEnroll}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: PROVISION NEW ACCOUNT ──────────────────────── */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Provision New Account</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {errorMsg ? (
              <View style={styles.errorNotice}>
                <Text style={styles.errorNoticeText}>{errorMsg}</Text>
              </View>
            ) : null}

            <ScrollView style={styles.modalForm}>
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>First Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Jane"
                    placeholderTextColor={COLORS.textMuted}
                    value={newFirstName}
                    onChangeText={setNewFirstName}
                  />
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Last Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Doe"
                    placeholderTextColor={COLORS.textMuted}
                    value={newLastName}
                    onChangeText={setNewLastName}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Email Address *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="jdoe@institution.edu"
                  placeholderTextColor={COLORS.textMuted}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Username *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="jdoe"
                    placeholderTextColor={COLORS.textMuted}
                    value={newUsername}
                    onChangeText={setNewUsername}
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Password *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Minimum 6 chars"
                    placeholderTextColor={COLORS.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Role Privilege *</Text>
                <View style={styles.chipRow}>
                  {ROLES.slice(0, 3).map(r => (
                    <Pressable
                      key={r.value}
                      style={[styles.filterChip, newRole === r.value && styles.filterChipActive]}
                      onPress={() => setNewRole(r.value as any)}
                    >
                      <Text style={[styles.filterChipText, newRole === r.value && styles.filterChipTextActive]}>
                        {r.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="secondary" size="md" onPress={() => setShowCreateModal(false)} />
              <Button
                title={actionLoading ? 'Creating...' : 'Create Account'}
                variant="primary"
                size="md"
                loading={actionLoading}
                onPress={handleCreateAccount}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: BATCH COHORT UPDATE ────────────────────────── */}
      <Modal visible={showBatchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Batch Cohort Status Update</Text>
              <Pressable onPress={() => setShowBatchModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.enrollModalSub}>
              Batch-updating status for {selectedStudentIds.length} student records.
            </Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Target Year Level:</Text>
              <View style={styles.chipRow}>
                {YEAR_LEVELS.map(y => (
                  <Pressable
                    key={y}
                    style={[styles.filterChip, batchYearLevel === y && styles.filterChipActive]}
                    onPress={() => setBatchYearLevel(y)}
                  >
                    <Text style={[styles.filterChipText, batchYearLevel === y && styles.filterChipTextActive]}>{y}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Active Semester:</Text>
              <View style={styles.chipRow}>
                {SEMESTERS.map(s => (
                  <Pressable
                    key={s}
                    style={[styles.filterChip, batchSemester === s && styles.filterChipActive]}
                    onPress={() => setBatchSemester(s)}
                  >
                    <Text style={[styles.filterChipText, batchSemester === s && styles.filterChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="secondary" size="md" onPress={() => setShowBatchModal(false)} />
              <Button
                title={actionLoading ? 'Updating...' : `Update ${selectedStudentIds.length} Students`}
                variant="primary"
                size="md"
                loading={actionLoading}
                onPress={handleBatchUpdateStatus}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerBtn: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  hamburgerIcon: {
    fontSize: 18,
    color: '#1A252F',
    fontWeight: '800',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A252F',
    letterSpacing: -0.3,
  },
  appSubTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  roleIdentityCard: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  roleIdentityPrefix: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  roleIdentityPill: {
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  roleIdentityPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#C0392B',
    letterSpacing: 0.5,
  },
  roleIdentityName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  mainShell: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarDesktop: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 16,
    justifyContent: 'space-between',
  },
  sidebarMobileDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  mobileDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A252F',
  },
  closeDrawerText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
    padding: 4,
  },
  sidebarUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sidebarAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sidebarUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A252F',
  },
  sidebarUserEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  sidebarRoleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  sidebarRoleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  navMenu: {
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  navItemActive: {
    backgroundColor: '#FEF2F2',
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  navItemTextActive: {
    color: '#C0392B',
    fontWeight: '800',
  },
  navBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  navBadgeActive: {
    backgroundColor: '#FDEDEC',
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  navBadgeTextActive: {
    color: '#C0392B',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
    marginTop: 14,
  },
  portalSwitchBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  portalSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C0392B',
  },
  workspace: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  workspaceBody: {
    padding: 24,
    maxWidth: 1300,
    alignSelf: 'center',
    width: '100%',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A252F',
  },
  panelSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A252F',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  dashboardSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A252F',
    marginBottom: 14,
  },
  curriculumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  curriculumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    width: '31%',
    minWidth: 260,
  },
  curriculumTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCodeBadge: {
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  courseCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C0392B',
  },
  enrollPill: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  enrollPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#27AE60',
  },
  curriculumName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 4,
  },
  curriculumFaculty: {
    fontSize: 12,
    color: '#64748B',
  },
  curriculumMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 12,
  },
  curriculumActions: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  filtersBar: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1A252F',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  filterItem: {
    gap: 4,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#1A252F',
    borderColor: '#1A252F',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  table: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  cellPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A252F',
  },
  cellSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cellText: {
    fontSize: 12,
    color: '#334155',
  },
  cellCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C0392B',
  },
  cellCohortText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  cellMuted: {
    fontSize: 11,
    color: '#94A3B8',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeStudent: { backgroundColor: '#E8F8F5' },
  badgeFaculty: { backgroundColor: '#EBF5FB' },
  badgeChair: { backgroundColor: '#FDEDEC' },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextStudent: { color: '#27AE60' },
  badgeTextFaculty: { color: '#2980B9' },
  badgeTextChair: { color: '#C0392B' },
  enrolledListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  enrolledChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  enrolledChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
  },
  unassignedText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  addEnrollBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C0392B',
  },
  addEnrollText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C0392B',
  },
  actionsCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyTable: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  loadingPad: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  enrollBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  enrollBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C0392B',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    width: 32,
  },
  completedCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#27AE60',
  },
  noticeBanner: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  noticeSuccess: {
    backgroundColor: '#E8F8F5',
  },
  noticeError: {
    backgroundColor: '#FDEDEC',
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A252F',
  },
  engineConfigCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 18,
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  criteriaGrid: {
    gap: 14,
  },
  criteriaField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  simulationCard: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  matrixMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  matrixPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  matrixPillVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  matrixPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  subjectGrantTag: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectGrantCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C0392B',
  },
  subjectGrantName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  executeRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  executeNotice: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A252F',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  enrollModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  subjectOptionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectOptionCardActive: {
    borderColor: '#C0392B',
    backgroundColor: '#FEF2F2',
  },
  subjectOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A252F',
  },
  subjectOptionMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  errorNotice: {
    backgroundColor: '#FDEDEC',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  errorNoticeText: {
    fontSize: 12,
    color: '#C0392B',
    fontWeight: '600',
  },
  modalForm: {
    maxHeight: 450,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1A252F',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
    marginTop: 10,
  },
});
