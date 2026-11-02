import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { Subject, Module, Topic } from '@/types/faculty';
import { Button } from '@/components/ui/Button';

interface CourseNavigatorProps {
  subjects: Subject[];
  activeSubject: Subject | null;
  onSelectSubject: (subject: Subject) => void;
  activeTopicId: string | null;
  onSelectTopic: (moduleId: string, topicId: string) => void;
  onAddModule: (subjectId: string, title: string) => Promise<void>;
  onUpdateModule: (subjectId: string, moduleId: string, title: string) => Promise<void>;
  onDeleteModule: (subjectId: string, moduleId: string) => Promise<void>;
  onAddTopic: (subjectId: string, moduleId: string, title: string) => Promise<void>;
  onDeleteTopic: (subjectId: string, moduleId: string, topicId: string) => Promise<void>;
  onOpenSubjectModal: () => void;
  onOpenEditSubjectModal: () => void;
  onDeleteSubject: (subjectId: string) => Promise<void>;
}

export function CourseNavigator({
  subjects,
  activeSubject,
  onSelectSubject,
  activeTopicId,
  onSelectTopic,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onAddTopic,
  onDeleteTopic,
  onOpenSubjectModal,
  onOpenEditSubjectModal,
  onDeleteSubject,
}: CourseNavigatorProps) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Module Modal state
  const [moduleModalVisible, setModuleModalVisible] = useState(false);
  const [moduleModalMode, setModuleModalMode] = useState<'create' | 'edit'>('create');
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [moduleTitleInput, setModuleTitleInput] = useState('');

  // Topic Modal state
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [targetParentModuleId, setTargetParentModuleId] = useState<string | null>(null);
  const [topicTitleInput, setTopicTitleInput] = useState('');

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subject' | 'module' | 'topic';
    id: string;
    secondaryId?: string;
    title: string;
  } | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleOpenAddModule = () => {
    setModuleModalMode('create');
    setTargetModuleId(null);
    setModuleTitleInput(`Module ${(activeSubject?.modules?.length || 0) + 1}: `);
    setModuleModalVisible(true);
  };

  const handleOpenEditModule = (mod: Module) => {
    setModuleModalMode('edit');
    setTargetModuleId(mod.id);
    setModuleTitleInput(mod.title);
    setModuleModalVisible(true);
  };

  const handleSaveModule = async () => {
    if (!activeSubject || !moduleTitleInput.trim()) return;
    if (moduleModalMode === 'create') {
      await onAddModule(activeSubject._id, moduleTitleInput.trim());
    } else if (targetModuleId) {
      await onUpdateModule(activeSubject._id, targetModuleId, moduleTitleInput.trim());
    }
    setModuleModalVisible(false);
  };

  const handleOpenAddTopic = (moduleId: string) => {
    setTargetParentModuleId(moduleId);
    setTopicTitleInput('Topic: ');
    setTopicModalVisible(true);
  };

  const handleSaveTopic = async () => {
    if (!activeSubject || !targetParentModuleId || !topicTitleInput.trim()) return;
    await onAddTopic(activeSubject._id, targetParentModuleId, topicTitleInput.trim());
    setTopicModalVisible(false);
  };

  const executeDelete = async () => {
    if (!deleteTarget || !activeSubject) return;
    if (deleteTarget.type === 'subject') {
      await onDeleteSubject(deleteTarget.id);
    } else if (deleteTarget.type === 'module') {
      await onDeleteModule(activeSubject._id, deleteTarget.id);
    } else if (deleteTarget.type === 'topic' && deleteTarget.secondaryId) {
      await onDeleteTopic(activeSubject._id, deleteTarget.secondaryId, deleteTarget.id);
    }
    setDeleteConfirmVisible(false);
    setDeleteTarget(null);
  };

  const filteredModules = (activeSubject?.modules || []).map(mod => {
    if (!searchQuery.trim()) return mod;
    const query = searchQuery.toLowerCase();
    const matchesModule = mod.title.toLowerCase().includes(query);
    const matchedTopics = mod.topics.filter(t => t.title.toLowerCase().includes(query));
    if (matchesModule || matchedTopics.length > 0) {
      return {
        ...mod,
        topics: matchesModule ? mod.topics : matchedTopics,
      };
    }
    return null;
  }).filter(Boolean) as Module[];

  return (
    <View style={styles.container}>
      {/* Subject Header */}
      <View style={styles.subjectCard}>
        <View style={styles.subjectTopRow}>
          <Text style={styles.navLabel}>Course Hierarchy</Text>
          <View style={styles.subjActionButtons}>
            <Pressable onPress={onOpenSubjectModal} style={styles.smallActionBtn}>
              <Text style={styles.smallActionText}>+ New</Text>
            </Pressable>
            {activeSubject && (
              <>
                <Pressable onPress={onOpenEditSubjectModal} style={styles.smallActionBtn}>
                  <Text style={styles.smallActionText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDeleteTarget({
                      type: 'subject',
                      id: activeSubject._id,
                      title: activeSubject.name,
                    });
                    setDeleteConfirmVisible(true);
                  }}
                  style={[styles.smallActionBtn, styles.deleteBtn]}
                >
                  <Text style={[styles.smallActionText, styles.deleteText]}>Del</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Active Subject Selector */}
        <Pressable
          style={styles.subjectSelector}
          onPress={() => setShowSubjectPicker(!showSubjectPicker)}
        >
          <View style={styles.subjectBadge}>
            <Text style={styles.subjectBadgeText}>{activeSubject?.code || 'N/A'}</Text>
          </View>
          <View style={styles.subjectNameWrapper}>
            <Text style={styles.subjectTitle} numberOfLines={1}>
              {activeSubject?.name || 'No subject created'}
            </Text>
            <Text style={styles.subjectMeta}>
              {activeSubject ? `${activeSubject.academicYear} | ${activeSubject.semester} | ${activeSubject.yearLevel}` : 'Click + New to create'}
            </Text>
          </View>
          <Text style={styles.dropdownCaret}>{showSubjectPicker ? '▲' : '▼'}</Text>
        </Pressable>

        {/* Dropdown list of subjects */}
        {showSubjectPicker && (
          <View style={styles.pickerDropdown}>
            {subjects.length === 0 ? (
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>No subjects available.</Text>
              </View>
            ) : (
              subjects.map(s => (
                <Pressable
                  key={s._id}
                  style={[styles.pickerItem, s._id === activeSubject?._id && styles.pickerItemActive]}
                  onPress={() => {
                    onSelectSubject(s);
                    setShowSubjectPicker(false);
                  }}
                >
                  <Text style={[styles.pickerCode, s._id === activeSubject?._id && styles.pickerCodeActive]}>
                    {s.code}
                  </Text>
                  <Text style={styles.pickerName} numberOfLines={1}>{s.name}</Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>

      {/* Search Filter */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter modules & topics..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Accordion Tree View */}
      <ScrollView style={styles.treeScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.treeHeader}>
          <Text style={styles.treeHeaderTitle}>STRUCTURED CURRICULUM</Text>
          <Text style={styles.treeStats}>
            {activeSubject?.modules.length || 0} Modules
          </Text>
        </View>

        {activeSubject && activeSubject.modules.length === 0 ? (
          <View style={styles.emptyNavigator}>
            <Text style={styles.emptyNavTitle}>No Modules Configured</Text>
            <Text style={styles.emptyNavSub}>Add your first module to begin structuring course topics.</Text>
            <Button
              title="+ Add Module"
              variant="outline"
              size="sm"
              onPress={handleOpenAddModule}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          filteredModules.map((moduleItem, modIdx) => {
            const isExpanded = expandedModules[moduleItem.id] ?? true;

            return (
              <View key={moduleItem.id} style={styles.moduleBlock}>
                {/* Module Header Bar */}
                <View style={styles.moduleHeader}>
                  <Pressable
                    style={styles.moduleHeaderClick}
                    onPress={() => toggleModule(moduleItem.id)}
                  >
                    <Text style={styles.accordionIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    <View style={styles.moduleTitleBox}>
                      <Text style={styles.moduleIndex}>MODULE {String(modIdx + 1).padStart(2, '0')}</Text>
                      <Text style={styles.moduleTitle} numberOfLines={2}>
                        {moduleItem.title}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Module Action Tools */}
                  <View style={styles.moduleTools}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => handleOpenEditModule(moduleItem)}
                    >
                      <Text style={styles.iconBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => {
                        setDeleteTarget({
                          type: 'module',
                          id: moduleItem.id,
                          title: moduleItem.title,
                        });
                        setDeleteConfirmVisible(true);
                      }}
                    >
                      <Text style={[styles.iconBtnText, styles.deleteColor]}>Del</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Topics Sub-tree */}
                {isExpanded && (
                  <View style={styles.topicsList}>
                    {moduleItem.topics.length === 0 ? (
                      <View style={styles.emptyTopicPlaceholder}>
                        <Text style={styles.emptyTopicPlaceholderText}>No topics in this module.</Text>
                      </View>
                    ) : (
                      moduleItem.topics.map(topic => {
                        const isActive = topic.id === activeTopicId;
                        const isPublished = topic.status === 'published';

                        return (
                          <View
                            key={topic.id}
                            style={[styles.topicRow, isActive && styles.topicRowActive]}
                          >
                            <Pressable
                              style={styles.topicSelectArea}
                              onPress={() => onSelectTopic(moduleItem.id, topic.id)}
                            >
                              <View style={[styles.activeIndicator, isActive && styles.activeIndicatorVisible]} />
                              <Text style={[styles.topicIndexBadge, isActive && styles.topicIndexBadgeActive]}>
                                {isPublished ? 'PUB' : 'DFT'}
                              </Text>
                              <Text
                                style={[styles.topicTitle, isActive && styles.topicTitleActive]}
                                numberOfLines={2}
                              >
                                {topic.title}
                              </Text>
                            </Pressable>

                            {/* Delete Topic Button */}
                            <Pressable
                              style={styles.topicDeleteBtn}
                              onPress={() => {
                                setDeleteTarget({
                                  type: 'topic',
                                  id: topic.id,
                                  secondaryId: moduleItem.id,
                                  title: topic.title,
                                });
                                setDeleteConfirmVisible(true);
                              }}
                            >
                              <Text style={styles.topicDeleteText}>✕</Text>
                            </Pressable>
                          </View>
                        );
                      })
                    )}

                    {/* Add Topic Action */}
                    <Pressable
                      style={styles.addTopicInline}
                      onPress={() => handleOpenAddTopic(moduleItem.id)}
                    >
                      <Text style={styles.addTopicText}>+ Add Topic</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Global Add Module Button */}
        {activeSubject && activeSubject.modules.length > 0 && (
          <Pressable
            style={styles.addModuleBtn}
            onPress={handleOpenAddModule}
          >
            <Text style={styles.addModulePlus}>+ Add Module</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* MODULE NAME MODAL */}
      <Modal visible={moduleModalVisible} transparent animationType="fade" onRequestClose={() => setModuleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>
              {moduleModalMode === 'create' ? 'Name New Module' : 'Rename Module'}
            </Text>
            <Text style={styles.dialogSub}>Specify the formal module title according to syllabus sequence.</Text>

            <TextInput
              style={styles.dialogInput}
              value={moduleTitleInput}
              onChangeText={setModuleTitleInput}
              placeholder="e.g., Module 01: Systems & Networks"
              autoFocus
            />

            <View style={styles.dialogActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setModuleModalVisible(false)}
              />
              <Button
                title={moduleModalMode === 'create' ? 'Create Module' : 'Save Title'}
                variant="primary"
                size="sm"
                onPress={handleSaveModule}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* TOPIC NAME MODAL */}
      <Modal visible={topicModalVisible} transparent animationType="fade" onRequestClose={() => setTopicModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Name New Topic</Text>
            <Text style={styles.dialogSub}>Specify the title for this instructional unit.</Text>

            <TextInput
              style={styles.dialogInput}
              value={topicTitleInput}
              onChangeText={setTopicTitleInput}
              placeholder="e.g., Topic 1.1: Foundations of Cybersecurity"
              autoFocus
            />

            <View style={styles.dialogActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setTopicModalVisible(false)}
              />
              <Button
                title="Create Topic"
                variant="primary"
                size="sm"
                onPress={handleSaveTopic}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={[styles.dialogTitle, { color: COLORS.error }]}>Confirm Deletion</Text>
            <Text style={styles.dialogSub}>
              Are you sure you want to delete this {deleteTarget?.type}: "{deleteTarget?.title}"? All nested contents will be permanently removed.
            </Text>

            <View style={styles.dialogActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setDeleteConfirmVisible(false)}
              />
              <Button
                title="Confirm Delete"
                variant="primary"
                size="sm"
                style={{ backgroundColor: COLORS.error }}
                onPress={executeDelete}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexDirection: 'column',
    height: '100%',
  },
  subjectCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FAFAFA',
  },
  subjectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subjActionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  smallActionBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  smallActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  deleteBtn: {
    borderColor: '#FADBD8',
    backgroundColor: '#FDEDEC',
  },
  deleteText: {
    color: COLORS.error,
  },
  subjectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 8,
  },
  subjectBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  subjectBadgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  subjectNameWrapper: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  subjectMeta: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  dropdownCaret: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  pickerDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerEmpty: {
    padding: 12,
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 8,
  },
  pickerItemActive: {
    backgroundColor: '#FDEDEC',
  },
  pickerCode: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pickerCodeActive: {
    color: COLORS.primary,
    backgroundColor: '#FADBD8',
  },
  pickerName: {
    fontSize: 11,
    color: COLORS.text,
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 32,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
  },
  clearSearch: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  treeScroll: {
    flex: 1,
    paddingHorizontal: 8,
  },
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  treeHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  treeStats: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  emptyNavigator: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNavTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyNavSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  moduleBlock: {
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  moduleHeaderClick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionIcon: {
    fontSize: 9,
    color: COLORS.textMuted,
    width: 12,
  },
  moduleTitleBox: {
    flex: 1,
  },
  moduleIndex: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  moduleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 15,
  },
  moduleTools: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  deleteColor: {
    color: COLORS.error,
  },
  topicsList: {
    paddingVertical: 2,
  },
  emptyTopicPlaceholder: {
    padding: 8,
    alignItems: 'center',
  },
  emptyTopicPlaceholderText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    position: 'relative',
  },
  topicRowActive: {
    backgroundColor: '#FDEDEC',
  },
  activeIndicator: {
    width: 2,
    height: '100%',
    backgroundColor: 'transparent',
    marginRight: 6,
  },
  activeIndicatorVisible: {
    backgroundColor: COLORS.primary,
  },
  topicSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicIndexBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textMuted,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  topicIndexBadgeActive: {
    color: COLORS.primary,
    backgroundColor: '#FADBD8',
  },
  topicTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  topicTitleActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  topicDeleteBtn: {
    padding: 4,
  },
  topicDeleteText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  addTopicInline: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  addTopicText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addModuleBtn: {
    marginTop: 6,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addModulePlus: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  dialogSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  dialogInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
