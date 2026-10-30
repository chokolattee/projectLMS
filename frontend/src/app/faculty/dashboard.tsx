import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { facultyApi, SubjectProgressReport } from '@/services/facultyApi';
import {
  Subject,
  CreateSubjectPayload,
  TopicContent,
  WaygroundQuiz,
} from '@/types/faculty';
import { COLORS } from '@/constants/colors';
import { FacultyHeader } from '@/components/faculty/FacultyHeader';
import { CourseNavigator } from '@/components/faculty/CourseNavigator';
import { TopicContentStudio } from '@/components/faculty/TopicContentStudio';
import { WaygroundQuizStudio } from '@/components/faculty/WaygroundQuizStudio';
import { ContextInspector } from '@/components/faculty/ContextInspector';
import { SubjectInitModal } from '@/components/faculty/SubjectInitModal';
import { Button } from '@/components/ui/Button';
import { FacultyProgressReport } from '@/components/faculty/FacultyProgressReport';

export default function FacultyDashboardScreen() {
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Role Gate: Redirect students to student dashboard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login' as any);
      return;
    }
    const role = String(user.role || '').trim().toLowerCase();
    if (role !== 'faculty' && role !== 'program chair' && role !== 'program_chair' && role !== 'admin') {
      router.replace('/student/dashboard');
    }
  }, [authLoading, user]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<'create' | 'edit'>('create');
  const [progressReport, setProgressReport] = useState<SubjectProgressReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Load faculty subjects on mount
  useEffect(() => {
    if (!authLoading && token && user?.role?.trim().toLowerCase() === 'faculty') loadSubjects();
  }, [authLoading, token, user]);

  const loadSubjects = async () => {
    setLoading(true);
    setLoadError('');
    const res = await facultyApi.getFacultySubjects(token);
    if (res.success && res.data) {
      setSubjects(res.data);
      if (res.data.length > 0) {
        const initialSubj = res.data[0];
        setActiveSubject(initialSubj);
        if (initialSubj.modules.length > 0) {
          const firstMod = initialSubj.modules[0];
          setActiveModuleId(firstMod.id);
          if (firstMod.topics.length > 0) {
            setActiveTopicId(firstMod.topics[0].id);
          }
        }
      } else {
        setActiveSubject(null);
        setActiveModuleId(null);
        setActiveTopicId(null);
      }
    } else {
      setLoadError(res.message || 'Unable to load faculty subjects.');
    }
    setLoading(false);
  };

  const activeModule = activeSubject?.modules.find(m => m.id === activeModuleId) || activeSubject?.modules[0] || null;
  const activeTopic = activeModule?.topics.find(t => t.id === activeTopicId) || activeModule?.topics[0] || null;

  // ─── SUBJECT CRUD HANDLERS ───────────────────────────────────
  const handleSelectSubject = (subj: Subject) => {
    setActiveSubject(subj);
    if (subj.modules.length > 0) {
      setActiveModuleId(subj.modules[0].id);
      if (subj.modules[0].topics.length > 0) {
        setActiveTopicId(subj.modules[0].topics[0].id);
      } else {
        setActiveTopicId(null);
      }
    } else {
      setActiveModuleId(null);
      setActiveTopicId(null);
    }
  };

  const handleCreateOrEditSubject = async (payload: CreateSubjectPayload): Promise<boolean> => {
    if (subjectModalMode === 'create') {
      const res = await facultyApi.createSubject(token, payload);
      if (res.success && res.data) {
        const updated = [res.data, ...subjects];
        setSubjects(updated);
        handleSelectSubject(res.data);
        return true;
      }
      Alert.alert('Subject could not be created', res.message || 'The server rejected the request.');
    } else if (activeSubject) {
      const res = await facultyApi.updateSubject(token, activeSubject._id, payload);
      if (res.success && res.data) {
        updateLocalSubject(res.data);
        return true;
      }
      Alert.alert('Subject could not be updated', res.message || 'The server rejected the request.');
    }
    return false;
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const res = await facultyApi.deleteSubject(token, subjectId);
    if (res.success) {
      const remaining = subjects.filter(s => s._id !== subjectId);
      setSubjects(remaining);
      if (remaining.length > 0) {
        handleSelectSubject(remaining[0]);
      } else {
        setActiveSubject(null);
        setActiveModuleId(null);
        setActiveTopicId(null);
      }
    }
  };

  // ─── MODULE CRUD HANDLERS ────────────────────────────────────
  const handleAddModule = async (subjectId: string, title: string) => {
    const res = await facultyApi.addModule(token, subjectId, title);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
    }
  };

  const handleUpdateModule = async (subjectId: string, moduleId: string, title: string) => {
    const res = await facultyApi.updateModule(token, subjectId, moduleId, title);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
    }
  };

  const handleDeleteModule = async (subjectId: string, moduleId: string) => {
    const res = await facultyApi.deleteModule(token, subjectId, moduleId);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      if (activeModuleId === moduleId) {
        setActiveModuleId(res.data.modules[0]?.id || null);
        setActiveTopicId(res.data.modules[0]?.topics[0]?.id || null);
      }
    }
  };

  // ─── TOPIC CRUD HANDLERS ─────────────────────────────────────
  const handleAddTopic = async (subjectId: string, moduleId: string, title: string) => {
    const res = await facultyApi.addTopic(token, subjectId, moduleId, title);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      const targetMod = res.data.modules.find(m => m.id === moduleId);
      if (targetMod && targetMod.topics.length > 0) {
        const latest = targetMod.topics[targetMod.topics.length - 1];
        setActiveModuleId(moduleId);
        setActiveTopicId(latest.id);
      }
    }
  };

  const handleSaveTopicContent = async (
    content: TopicContent,
    newTitle?: string,
    newStatus?: 'draft' | 'published'
  ): Promise<boolean> => {
    if (!activeSubject || !activeTopic) return false;
    const res = await facultyApi.updateTopic(token, activeSubject._id, activeTopic.id, {
      content,
      title: newTitle,
      status: newStatus,
    });
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      return true;
    }
    return false;
  };

  const handleDeleteTopic = async (subjectId: string, moduleId: string, topicId: string) => {
    const res = await facultyApi.deleteTopic(token, subjectId, moduleId, topicId);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      if (activeTopicId === topicId) {
        const targetMod = res.data.modules.find(m => m.id === moduleId);
        setActiveTopicId(targetMod?.topics[0]?.id || null);
      }
    }
  };

  // ─── WAYGROUND QUIZ HANDLER ──────────────────────────────────
  const handleSaveQuiz = async (quiz: WaygroundQuiz) => {
    if (!activeSubject || !activeTopic) return;
    const res = await facultyApi.saveTopicQuiz(token, activeSubject._id, activeTopic.id, quiz);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
    }
  };

  // ─── FILE UPLOAD HANDLERS (AWS S3) ──────────────────────────
  const handleUploadPresentation = async (topicId: string, file: File) => {
    const res = await facultyApi.uploadPresentation(token, topicId, file, activeSubject?._id);
    if (res.success && res.data) {
      if (res.subject) {
        updateLocalSubject(res.subject);
      }
      return res.data;
    }
    return null;
  };

  const handleUploadQuizDocument = async (file: File) => {
    const res = await facultyApi.uploadQuizDocument(token, file);
    if (res.success && res.data) {
      return {
        extractedText: res.data.extractedText,
        fileName: res.data.fileName,
      };
    }
    return null;
  };

  const handleGenerateSummary = async (richText: string, presentationText: string) => {
    const res = await facultyApi.generateTopicSummary(token, richText, presentationText);
    return res.success && res.data?.summary ? res.data.summary : null;
  };

  const handlePublishToggle = () => {
    if (!activeTopic) return;
    const nextStatus = activeTopic.status === 'published' ? 'draft' : 'published';
    handleSaveTopicContent(activeTopic.content || {}, activeTopic.title, nextStatus);
  };

  const handleOpenReport = async () => {
    if (!activeSubject) return;
    setLoadingReport(true);
    const res = await facultyApi.getSubjectProgressReport(token, activeSubject._id);
    setLoadingReport(false);
    if (res.success && res.data) {
      setProgressReport(res.data);
    }
  };

  const updateLocalSubject = (updated: Subject) => {
    setSubjects(prev => prev.map(s => (s._id === updated._id ? updated : s)));
    setActiveSubject(updated);
  };

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Course Studio...</Text>
      </View>
    );
  }

  if (progressReport) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FacultyProgressReport report={progressReport} onClose={() => setProgressReport(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Breadcrumb & Actions Bar */}
      <FacultyHeader
        subject={activeSubject}
        module={activeModule}
        topic={activeTopic}
        onOpenSubjectModal={() => {
          setSubjectModalMode('create');
          setSubjectModalVisible(true);
        }}
      />

      {/* Main Workspace Layout */}
      <View style={styles.reportBar}>
        <Text style={styles.reportBarText}>Student performance and quiz history</Text>
        <Button
          title={loadingReport ? 'Loading Report...' : 'View Student Reports'}
          variant="secondary"
          size="sm"
          loading={loadingReport}
          disabled={!activeSubject || loadingReport}
          onPress={handleOpenReport}
        />
      </View>
      <View style={styles.workspaceContainer}>
        <View style={styles.facultyRail}>
          <Text style={styles.railBrand}>LMS</Text>
          <Text style={styles.railRole}>FACULTY</Text>
          <View style={styles.railDivider} />
          <View style={styles.railItemActive}><Text style={styles.railItemTextActive}>▣  Workspace</Text></View>
          <Pressable style={styles.railItem} onPress={handleOpenReport} disabled={!activeSubject || loadingReport}>
            <Text style={styles.railItemText}>▤  Reports</Text>
          </Pressable>
          <Pressable style={styles.railItem} onPress={() => setSubjectModalVisible(true)}>
            <Text style={styles.railItemText}>＋  Subject</Text>
          </Pressable>
        </View>
        {/* Left Column: Course Hierarchy Navigator */}
        <CourseNavigator
          subjects={subjects}
          activeSubject={activeSubject}
          onSelectSubject={handleSelectSubject}
          activeTopicId={activeTopic?.id || null}
          onSelectTopic={(modId, topId) => {
            setActiveModuleId(modId);
            setActiveTopicId(topId);
          }}
          onAddModule={handleAddModule}
          onUpdateModule={handleUpdateModule}
          onDeleteModule={handleDeleteModule}
          onAddTopic={handleAddTopic}
          onDeleteTopic={handleDeleteTopic}
          onOpenSubjectModal={() => {
            setSubjectModalMode('create');
            setSubjectModalVisible(true);
          }}
          onOpenEditSubjectModal={() => {
            setSubjectModalMode('edit');
            setSubjectModalVisible(true);
          }}
          onDeleteSubject={handleDeleteSubject}
        />

        {/* Center Column: Multi-Pane Studio & Quiz Builder */}
        <ScrollView style={styles.centerWorkspace} contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
          {!activeSubject ? (
            <View style={styles.noDataCard}>
              <Text style={styles.noDataTitle}>{loadError ? 'Subjects Could Not Be Loaded' : 'No Subjects Initialized'}</Text>
              <Text style={styles.noDataSub}>{loadError || 'Your existing subjects will appear here.'}</Text>
              <Button
                title={loadError ? 'Retry Loading Subjects' : '+ Initialize Subject'}
                variant="primary"
                size="md"
                onPress={loadError ? loadSubjects : () => {
                  setSubjectModalMode('create');
                  setSubjectModalVisible(true);
                }}
                style={{ marginTop: 14 }}
              />
            </View>
          ) : !activeTopic ? (
            <View style={styles.noDataCard}>
              <Text style={styles.noDataTitle}>No Topic Selected</Text>
              <Text style={styles.noDataSub}>Add a module and topic from the left hierarchy navigator to author content.</Text>
            </View>
          ) : (
            <>
              {/* Core Feature 2: Content Studio */}
              <TopicContentStudio
                topic={activeTopic}
                subjectId={activeSubject._id}
                token={token}
                onSaveContent={handleSaveTopicContent}
                onUploadPresentation={handleUploadPresentation}
                onGenerateSummary={handleGenerateSummary}
              />

              {/* Core Feature 3: Advanced Wayground Quiz Studio */}
              <WaygroundQuizStudio
                quiz={activeTopic.quiz}
                token={token}
                onSaveQuiz={handleSaveQuiz}
                onUploadQuizDocument={handleUploadQuizDocument}
              />
            </>
          )}
        </ScrollView>

        {/* Right Column: Context Inspector (Desktop view) */}
        {isDesktop && (
          <ContextInspector
            subject={activeSubject}
            topic={activeTopic}
            onPublishTopic={handlePublishToggle}
            onOpenSubjectModal={() => {
              setSubjectModalMode('edit');
              setSubjectModalVisible(true);
            }}
          />
        )}
      </View>

      {/* Subject Create / Edit Modal */}
      <SubjectInitModal
        visible={subjectModalVisible}
        mode={subjectModalMode}
        initialData={subjectModalMode === 'edit' ? activeSubject : null}
        onClose={() => setSubjectModalVisible(false)}
        onSubmit={handleCreateOrEditSubject}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  workspaceContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  facultyRail: {
    width: 148,
    backgroundColor: '#0F172A',
    padding: 14,
    gap: 8,
  },
  railBrand: { color: '#5EEAD4', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  railRole: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  railDivider: { height: 1, backgroundColor: '#334155', marginVertical: 10 },
  railItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
  railItemActive: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#134E4A' },
  railItemText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  railItemTextActive: { color: '#99F6E4', fontSize: 11, fontWeight: '800' },
  reportBar: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportBarText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  centerWorkspace: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    padding: 18,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  noDataCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  noDataSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
