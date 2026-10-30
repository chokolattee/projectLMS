import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { DashboardData, EnrolledSubject } from '@/types/auth';
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import {
  studentApi,
  StudentSubjectDetails,
  StudentModule,
  StudentTopic,
} from '@/services/studentApi';
import { WaygroundStudentQuizModal } from '@/components/student/WaygroundStudentQuizModal';
import { PresentationViewer } from '@/components/presentation/PresentationViewer';

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function StatCard({ label, value, bgColor }: { label: string; value: string | number; bgColor: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { fetchDashboard, user, token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  // Role Gate: Redirect faculty and chairs
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login' as any);
        return;
      }
      if (user.role !== 'student') {
        if (user.role === 'program chair' || user.role === 'program_chair' || user.role === 'admin') {
          router.replace('/chair/dashboard' as any);
        } else {
          router.replace('/faculty/dashboard' as any);
        }
      }
    }
  }, [authLoading, user]);

  // Overall student stats & enrolled subjects
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // NetAcad Course Viewer Workspace State
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [subjectDetails, setSubjectDetails] = useState<StudentSubjectDetails | null>(null);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'text' | 'presentation' | 'summary'>('text');

  // Wayground Quiz Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('');

  useEffect(() => {
    if (!authLoading) {
      loadDashboard();
      setTimeOfDay(getTimeOfDay());
    }
  }, [authLoading]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    const result = await fetchDashboard();
    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.message || 'Failed to load dashboard');
    }
    setLoading(false);
  };

  const handleOpenCourse = async (subjectId: string) => {
    setActiveSubjectId(subjectId);
    setLoadingSubject(true);
    const res = await studentApi.getSubjectDetails(token, subjectId);
    setLoadingSubject(false);

    if (res.success && res.data) {
      setSubjectDetails(res.data);
      const firstMod = res.data.modules[0];
      if (firstMod) {
        setActiveModuleId(firstMod.id);
        const firstTopic = firstMod.topics[0];
        if (firstTopic) {
          setActiveTopicId(firstTopic.id);
        }
      }
    } else {
      Alert.alert('Course Unavailable', res.message || 'Could not load course curriculum.');
      setActiveSubjectId(null);
    }
  };

  const reloadSubjectDetails = async () => {
    if (!activeSubjectId) return;
    const res = await studentApi.getSubjectDetails(token, activeSubjectId);
    if (res.success && res.data) {
      setSubjectDetails(res.data);
    }
  };

  const activeModule = subjectDetails?.modules.find(m => m.id === activeModuleId) || subjectDetails?.modules[0] || null;
  const activeTopic = activeModule?.topics.find(t => t.id === activeTopicId) || activeModule?.topics[0] || null;

  const handleProceedToNextTopic = async () => {
    if (!subjectDetails || !activeTopic) {
      setShowQuizModal(false);
      return;
    }

    const topics = subjectDetails.modules.flatMap(module => module.topics);
    const currentIndex = topics.findIndex(topic => topic.id === activeTopic.id);
    const nextTopic = currentIndex >= 0 ? topics[currentIndex + 1] : undefined;

    setShowQuizModal(false);
    if (nextTopic) {
      const nextModule = subjectDetails.modules.find(module =>
        module.topics.some(topic => topic.id === nextTopic.id)
      );
      if (nextModule) {
        setActiveModuleId(nextModule.id);
        setActiveTopicId(nextTopic.id);
        setWorkspaceTab('text');
      }
    }
    await reloadSubjectDetails();
  };

  const handleMarkReviewed = async () => {
    if (!activeSubjectId || !activeTopic) return;
    setMarkingReviewed(true);
    const res = await studentApi.markTopicReviewed(token, activeSubjectId, activeTopic.id);
    if (res.success) {
      await reloadSubjectDetails();
    } else {
      Alert.alert('Error', res.message || 'Could not update review status.');
    }
    setMarkingReviewed(false);
  };

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    if (!activeSubjectId || !activeTopic) {
      return { success: false };
    }
    const res = await studentApi.submitQuiz(token, activeSubjectId, activeTopic.id, answers);
    if (res.success) {
      await reloadSubjectDetails();
    }
    return res;
  };

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your learning dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadDashboard} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ─── 1. NETACAD COURSE VIEWER WORKSPACE ─────────────────────────
  // ════════════════════════════════════════════════════════════════
  if (activeSubjectId && subjectDetails) {
    const hasQuiz = activeTopic?.quiz && (activeTopic.quiz.questions?.length || 0) > 0;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* NetAcad Persistent Top Bar with Progress Tracking */}
        <View style={styles.netacadTopBar}>
          <View style={styles.netacadTopLeft}>
            <Pressable style={styles.backBtn} onPress={() => setActiveSubjectId(null)}>
              <Text style={styles.backBtnText}>← All Courses</Text>
            </Pressable>
            {!isDesktop && (
              <Pressable
                style={styles.treeToggleBtn}
                onPress={() => setMobileCurriculumOpen(prev => !prev)}
              >
                <Text style={styles.treeToggleBtnText}>
                  {mobileCurriculumOpen ? '✕ Close Tree' : '☰ Modules'}
                </Text>
              </Pressable>
            )}
            <View style={styles.courseTag}>
              <Text style={styles.courseTagText}>{subjectDetails.subject?.code || (subjectDetails as any).code || 'COURSE'}</Text>
            </View>
            <Text style={styles.courseNameTop} numberOfLines={1}>
              {subjectDetails.subject?.name || (subjectDetails as any).name || 'Course Curriculum'}
            </Text>
          </View>

          {/* Continuous Progress Tracker */}
          <View style={styles.netacadProgressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressTrackerLabel}>COURSE COMPLETION</Text>
              <Text style={styles.progressTrackerPercent}>{subjectDetails.overallProgressPercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${subjectDetails.overallProgressPercent}%` }]} />
            </View>
          </View>
        </View>

        <View style={[styles.netacadWorkspace, !isDesktop && { flexDirection: 'column' }]}>
          {/* Persistent Left Navigation Menu: Module Hierarchy Tree */}
          {(isDesktop || mobileCurriculumOpen || !activeTopic) && (
            <View style={[styles.netacadSidebar, !isDesktop && { width: '100%', maxHeight: mobileCurriculumOpen ? 340 : '100%' }]}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarHeaderTitle}>COURSE CURRICULUM</Text>
                <Text style={styles.sidebarHeaderSub}>Sequential Mastery Track</Text>
              </View>

              <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
                {subjectDetails.modules.map(mod => (
                  <View key={mod.id} style={styles.moduleBlock}>
                    <View style={styles.moduleHeaderRow}>
                      <Text style={styles.moduleTitleText}>{mod.title}</Text>
                    </View>

                    <View style={styles.topicsTree}>
                      {mod.topics.map(top => {
                        const isActive = activeTopic?.id === top.id;
                        const isLocked = !top.unlocked;
                        const isCompleted = top.quizPassed || (top.contentReviewed && (!top.quiz || top.quiz.questions.length === 0));

                        return (
                          <Pressable
                            key={top.id}
                            style={[
                              styles.topicItem,
                              isActive && styles.topicItemActive,
                              isLocked && styles.topicItemLocked,
                            ]}
                            disabled={isLocked}
                            onPress={() => {
                              setActiveModuleId(mod.id);
                              setActiveTopicId(top.id);
                              setWorkspaceTab('text');
                              if (!isDesktop) setMobileCurriculumOpen(false);
                            }}
                          >
                          <View style={styles.topicStatusIndicator}>
                            {isCompleted ? (
                              <View style={styles.indicatorCompleted}>
                                <Text style={styles.indicatorTextCompleted}>✓</Text>
                              </View>
                            ) : isLocked ? (
                              <View style={styles.indicatorLocked}>
                                <Text style={styles.indicatorTextLocked}>🔒</Text>
                              </View>
                            ) : (
                              <View style={[styles.indicatorActive, isActive && styles.indicatorCurrent]}>
                                <Text style={styles.indicatorTextActive}>►</Text>
                              </View>
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.topicItemTitle,
                                isActive && styles.topicItemTitleActive,
                                isLocked && styles.topicItemTitleLocked,
                              ]}
                              numberOfLines={2}
                            >
                              {top.title}
                            </Text>
                            <Text style={styles.topicMetaSub}>
                              {isCompleted
                                ? (top.quizPassed ? `Passed (${top.bestScorePercent}%)` : 'Completed')
                                : isLocked
                                ? 'Prerequisite Required'
                                : (top.contentReviewed ? 'Quiz Ready' : 'In Progress')}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
          )}

          {/* Central Dominant Workspace */}
          <View style={styles.netacadMainViewport}>
            {activeTopic ? (
              <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollBody}>
                {/* Topic Header Card */}
                <View style={styles.topicHeroCard}>
                  <View style={styles.topicHeroMeta}>
                    <Text style={styles.activeModuleBreadcrumb}>{activeModule?.title}</Text>
                    <Text style={styles.activeTopicTitle}>{activeTopic.title}</Text>
                  </View>

                  {/* Tabs: Text Prose, Presentation (AWS S3), Summary */}
                  <View style={styles.topicTabRow}>
                    <Pressable
                      style={[styles.topicTabBtn, workspaceTab === 'text' && styles.topicTabBtnActive]}
                      onPress={() => setWorkspaceTab('text')}
                    >
                      <Text style={[styles.topicTabText, workspaceTab === 'text' && styles.topicTabTextActive]}>
                        Instructional Text
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.topicTabBtn, workspaceTab === 'presentation' && styles.topicTabBtnActive]}
                      onPress={() => setWorkspaceTab('presentation')}
                    >
                      <Text style={[styles.topicTabText, workspaceTab === 'presentation' && styles.topicTabTextActive]}>
                        Presentation (AWS S3)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.topicTabBtn, workspaceTab === 'summary' && styles.topicTabBtnActive]}
                      onPress={() => setWorkspaceTab('summary')}
                    >
                      <Text style={[styles.topicTabText, workspaceTab === 'summary' && styles.topicTabTextActive]}>
                        Summary & Takeaways
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* TAB 1: INSTRUCTIONAL TEXT CONTENT */}
                {workspaceTab === 'text' && (
                  <View style={styles.contentBodyCard}>
                    {activeTopic.content?.richText ? (
                      <Text style={styles.proseContent}>
                        {activeTopic.content.richText.replace(/<[^>]+>/g, '')}
                      </Text>
                    ) : (
                      <View style={styles.emptyContentPad}>
                        <Text style={styles.emptyContentText}>No text prose provided for this topic.</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* TAB 2: PRESENTATION (AWS S3) */}
                {workspaceTab === 'presentation' && (
                  <View style={styles.contentBodyCard}>
                    {activeTopic.content?.presentationUrl ? (
                      <PresentationViewer
                        url={activeTopic.content.presentationUrl}
                        fileName={activeTopic.content.presentationFileName || `${activeTopic.title}.pptx`}
                        fileSize={activeTopic.content.presentationFileSize}
                        s3Key={activeTopic.content.presentationS3Key}
                        minHeight={600}
                      />
                    ) : (
                      <View style={styles.emptyContentPad}>
                        <Text style={styles.emptyContentText}>No presentation slide deck attached to this topic.</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* TAB 3: SUMMARY & TAKEAWAYS */}
                {workspaceTab === 'summary' && (
                  <View style={styles.contentBodyCard}>
                    {activeTopic.content?.summaryText ? (
                      <View style={styles.summaryBlock}>
                        <Text style={styles.summaryTitle}>Topic Executive Summary</Text>
                        <Text style={styles.summaryParagraph}>{activeTopic.content.summaryText}</Text>
                      </View>
                    ) : null}

                    {activeTopic.content?.summaryBullets && activeTopic.content.summaryBullets.length > 0 ? (
                      <View style={[styles.summaryBlock, { marginTop: 16 }]}>
                        <Text style={styles.summaryTitle}>Key Takeaway Points</Text>
                        {activeTopic.content.summaryBullets.map((bullet, idx) => (
                          <View key={idx} style={styles.bulletItem}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {!activeTopic.content?.summaryText && (!activeTopic.content?.summaryBullets || activeTopic.content.summaryBullets.length === 0) && (
                      <View style={styles.emptyContentPad}>
                        <Text style={styles.emptyContentText}>No summary points generated for this topic yet.</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ─── MASTERY GATE & ASSESSMENT ACTION BAR ────────── */}
                <View style={styles.masteryGateCard}>
                  <View style={styles.masteryStatusInfo}>
                    <Text style={styles.masteryGateTitle}>TOPIC PROGRESSION & MASTERY LOCK</Text>
                    <Text style={styles.masteryGateDesc}>
                      {activeTopic.quizPassed
                        ? 'Mastery satisfied! You have passed this topic assessment. The next lesson is unlocked.'
                        : activeTopic.contentReviewed
                        ? 'Content fully reviewed. The assessment is now unlocked. Score at least ' + (activeTopic.quiz?.passingScorePercent || 75) + '% to proceed.'
                        : 'Review the text prose and presentation slides, then click "Mark as Reviewed" to unlock the Wayground assessment.'}
                    </Text>
                  </View>

                  <View style={styles.masteryActionButtons}>
                    {!activeTopic.contentReviewed && (
                      <Button
                        title={markingReviewed ? 'Saving Review...' : 'Mark Content as Reviewed'}
                        variant="secondary"
                        size="md"
                        loading={markingReviewed}
                        onPress={handleMarkReviewed}
                      />
                    )}

                    {hasQuiz && activeTopic.contentReviewed && (
                      <Button
                        title={activeTopic.quizPassed ? 'Assessment Passed' : 'Take Topic Assessment (Wayground Engine)'}
                        variant="primary"
                        size="md"
                        disabled={activeTopic.quizPassed}
                        onPress={() => setShowQuizModal(true)}
                      />
                    )}
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.noTopicSelected}>
                <Text style={styles.noTopicTitle}>Select a Topic</Text>
                <Text style={styles.noTopicSub}>Choose an unlocked topic from the left curriculum tree to begin studying.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Wayground Adaptive Quiz Engine Modal */}
        {activeTopic?.quiz && (
          <WaygroundStudentQuizModal
            visible={showQuizModal}
            quiz={activeTopic.quiz}
            topicTitle={activeTopic.title}
            onClose={() => setShowQuizModal(false)}
            onSubmit={handleQuizSubmit}
            onReviewContent={() => {
              setWorkspaceTab('text');
            }}
            onProceedToNextTopic={handleProceedToNextTopic}
          />
        )}
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ─── 2. DEFAULT STUDENT LEARNING DASHBOARD ──────────────────────
  // ════════════════════════════════════════════════════════════════
  const profile = data?.profile;
  const academics = data?.academics;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Academic Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarInitials}>
                {(profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{timeOfDay ? `Good ${timeOfDay},` : 'Welcome,'}</Text>
              <Text style={styles.studentName}>{profile?.firstName} {profile?.lastName}</Text>
              <Text style={styles.studentId}>
                ID: {profile?.studentId} • {user?.yearLevel || '1st Year'} • {academics?.semester || '1st Semester'} • SY {user?.schoolYear || '2026-2027'}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8' }}>LOGGED IN AS:</Text>
              <View style={{ backgroundColor: '#E8F8F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#27AE60' }}>STUDENT</Text>
              </View>
            </View>
            <View style={styles.semesterBadge}>
              <Text style={styles.semesterText}>{academics?.semester || 'Active Term'}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <StatCard label="GPA" value={academics?.gpa?.toFixed(2) ?? '—'} bgColor="#FEF9E7" />
          <StatCard label="Enrolled Credits" value={academics?.totalCredits ?? 0} bgColor="#EBF5FB" />
          <StatCard label="Completed Credits" value={academics?.completedCredits ?? 0} bgColor="#EAFAF1" />
          <StatCard label="Total Subjects" value={academics?.totalSubjects ?? 0} bgColor="#FDEDEC" />
        </View>

        {/* Currently Enrolled Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Currently Enrolled Subjects</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{academics?.totalSubjects || 0} Courses</Text>
            </View>
          </View>

          {loadingSubject && (
            <View style={styles.centerPad}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingCourseText}>Opening course curriculum workspace...</Text>
            </View>
          )}

          {academics?.enrolledSubjects && academics.enrolledSubjects.length > 0 ? (
            academics.enrolledSubjects.filter(Boolean).map((subject, index) => (
              <View key={subject.code || subject.id || `enrolled-subject-${index}`} style={styles.courseEnrollCard}>
                <View style={styles.courseEnrollLeft}>
                  <View style={styles.codePill}>
                    <Text style={styles.codePillText}>{subject.code || 'SUBJ'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseEnrollTitle}>{subject.title || 'Untitled Subject'}</Text>
                    <Text style={styles.courseEnrollMeta}>
                      Instructor: {subject.instructor || 'Faculty'} • {subject.schedule || 'Institutional Track'}
                    </Text>
                  </View>
                </View>

                <Button
                  title="Open Course Track"
                  variant="primary"
                  size="sm"
                  onPress={() => handleOpenCourse(subject.id || subject.code)}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Enrolled Courses</Text>
              <Text style={styles.emptySub}>
                You are not currently enrolled in any subjects. Contact your Program Chair for enrollment assignment.
              </Text>
            </View>
          )}
        </View>

        {/* Academic Degree Progress Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Academic Year</Text>
                <Text style={styles.overviewValue}>{academics?.academicYear || '2026-2027'}</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Standing</Text>
                <Text style={[styles.overviewValue, styles.standingGood]}>{academics?.standing || 'Good Standing'}</Text>
              </View>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Degree Credit Progress</Text>
                <Text style={styles.progressPercent}>
                  {Math.round(((academics?.completedCredits ?? 0) / 120) * 100)}%
                </Text>
              </View>
              <View style={styles.progressTrackBar}>
                <View
                  style={[
                    styles.progressTrackFill,
                    { width: `${Math.min(Math.round(((academics?.completedCredits ?? 0) / 120) * 100), 100)}%` as any },
                  ]}
                />
              </View>
              <Text style={styles.progressNote}>{academics?.completedCredits ?? 0} / 120 total credits completed</Text>
            </View>
          </View>
        </View>

        {/* Student Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Profile & Cohort Information</Text>
          <View style={styles.infoCard}>
            {[
              { label: 'Full Name', value: profile?.fullName || `${profile?.firstName} ${profile?.lastName}` },
              { label: 'Institutional Email', value: profile?.email },
              { label: 'Username', value: `@${profile?.username}` },
              { label: 'Student Identification ID', value: profile?.studentId },
              { label: 'Year Level & Semester', value: `${user?.yearLevel || '1st Year'} • ${user?.activeSemester || '1st Semester'}` },
              { label: 'School Year', value: user?.schoolYear || '2026-2027' },
            ].map((item, i) => (
              <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A252F',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#C0392B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A252F',
    letterSpacing: -0.3,
  },
  studentId: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  semesterBadge: {
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  semesterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C0392B',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A252F',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A252F',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  courseEnrollCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseEnrollLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    marginRight: 16,
  },
  codePill: {
    backgroundColor: '#FDEDEC',
    borderWidth: 1,
    borderColor: '#FADBD8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C0392B',
  },
  courseEnrollTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A252F',
  },
  courseEnrollMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A252F',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  centerPad: {
    padding: 20,
    alignItems: 'center',
  },
  loadingCourseText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  overviewItem: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A252F',
    marginTop: 4,
  },
  standingGood: {
    color: '#27AE60',
  },
  overviewDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C0392B',
  },
  progressTrackBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: '#C0392B',
  },
  progressNote: {
    fontSize: 11,
    color: '#94A3B8',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoContent: {},
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A252F',
    marginTop: 3,
  },

  // ─── NETACAD WORKSPACE STYLES ─────────────────────────────────
  netacadTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  netacadTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  treeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C0392B',
    backgroundColor: '#FDEDEC',
  },
  treeToggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C0392B',
  },
  courseTag: {
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  courseTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C0392B',
  },
  courseNameTop: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A252F',
    flex: 1,
  },
  netacadProgressSection: {
    width: 220,
    marginLeft: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressTrackerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  progressTrackerPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C0392B',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C0392B',
  },
  netacadWorkspace: {
    flex: 1,
    flexDirection: 'row',
  },
  netacadSidebar: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sidebarHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  sidebarHeaderSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sidebarScroll: {
    flex: 1,
  },
  moduleBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  moduleHeaderRow: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  moduleTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  topicsTree: {
    paddingVertical: 4,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  topicItemActive: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#C0392B',
  },
  topicItemLocked: {
    opacity: 0.6,
  },
  topicStatusIndicator: {
    marginRight: 10,
  },
  indicatorCompleted: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorTextCompleted: {
    fontSize: 11,
    fontWeight: '800',
    color: '#27AE60',
  },
  indicatorLocked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorTextLocked: {
    fontSize: 10,
  },
  indicatorActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorCurrent: {
    backgroundColor: '#FDEDEC',
  },
  indicatorTextActive: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C0392B',
  },
  topicItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  topicItemTitleActive: {
    color: '#C0392B',
    fontWeight: '700',
  },
  topicItemTitleLocked: {
    color: '#94A3B8',
  },
  topicMetaSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  netacadMainViewport: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollBody: {
    padding: 24,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  topicHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  topicHeroMeta: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  activeModuleBreadcrumb: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeTopicTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A252F',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  topicTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
  },
  topicTabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topicTabBtnActive: {
    borderBottomColor: '#C0392B',
    backgroundColor: '#FFFFFF',
  },
  topicTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  topicTabTextActive: {
    color: '#C0392B',
    fontWeight: '700',
  },
  contentBodyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    minHeight: 280,
    marginBottom: 16,
  },
  proseContent: {
    fontSize: 14,
    lineHeight: 24,
    color: '#334155',
  },
  emptyContentPad: {
    padding: 30,
    alignItems: 'center',
  },
  emptyContentText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  s3PresentationCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  s3PresentationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  s3BadgeSquare: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  s3BadgeSquareText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  presentationName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A252F',
  },
  presentationStorageStatus: {
    fontSize: 11,
    color: '#27AE60',
    fontWeight: '600',
    marginTop: 2,
  },
  presentationSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  downloadSlideBtn: {
    backgroundColor: '#1A252F',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  downloadSlideBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryBlock: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryParagraph: {
    fontSize: 13,
    lineHeight: 22,
    color: '#475569',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C0392B',
    marginTop: 7,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
    flex: 1,
  },
  masteryGateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  masteryStatusInfo: {
    flex: 1,
    minWidth: 260,
  },
  masteryGateTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  masteryGateDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  masteryActionButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  noTopicSelected: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noTopicTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A252F',
  },
  noTopicSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
});
