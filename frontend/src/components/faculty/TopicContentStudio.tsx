import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { Topic, TopicContent } from '@/types/faculty';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/faculty/RichTextEditor';
import { PresentationViewer } from '@/components/presentation/PresentationViewer';

interface TopicContentStudioProps {
  topic: Topic;
  subjectId: string;
  token: string | null;
  onSaveContent: (content: TopicContent, newTitle?: string, newStatus?: 'draft' | 'published') => Promise<boolean>;
  onUploadPresentation: (topicId: string, file: File) => Promise<{ s3Key: string; publicUrl: string; fileName: string; fileSize: number; extractedText?: string } | null>;
  onGenerateSummary?: (richText: string, presentationText: string) => Promise<string | null>;
}

type TabType = 'text' | 'presentation' | 'summary';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function TopicContentStudio({
  topic,
  subjectId,
  token,
  onSaveContent,
  onUploadPresentation,
  onGenerateSummary,
}: TopicContentStudioProps) {
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [title, setTitle] = useState(topic.title);
  const [status, setStatus] = useState<'draft' | 'published'>(topic.status || 'draft');

  // Tab 1: Text Content
  const [richText, setRichText] = useState(topic.content?.richText || '');

  // Tab 2: Presentation (AWS S3)
  const [presentationFileName, setPresentationFileName] = useState(topic.content?.presentationFileName || '');
  const [presentationS3Key, setPresentationS3Key] = useState(topic.content?.presentationS3Key || '');
  const [presentationUrl, setPresentationUrl] = useState(topic.content?.presentationUrl || '');
  const [presentationFileSize, setPresentationFileSize] = useState(topic.content?.presentationFileSize || 0);
  const [presentationExtractedText, setPresentationExtractedText] = useState(topic.content?.presentationExtractedText || '');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 3: Summary
  const [summaryText, setSummaryText] = useState(topic.content?.summaryText || '');
  const [summaryBullets, setSummaryBullets] = useState<string[]>(topic.content?.summaryBullets || []);
  const [newBulletText, setNewBulletText] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setTitle(topic.title);
    setStatus(topic.status || 'draft');
    setRichText(topic.content?.richText || '');
    setPresentationFileName(topic.content?.presentationFileName || '');
    setPresentationS3Key(topic.content?.presentationS3Key || '');
    setPresentationUrl(topic.content?.presentationUrl || '');
    setPresentationFileSize(topic.content?.presentationFileSize || 0);
    setPresentationExtractedText(topic.content?.presentationExtractedText || '');
    setSummaryText(topic.content?.summaryText || '');
    setSummaryBullets(topic.content?.summaryBullets || []);
    setUploadMsg('');
    setUploadError('');
  }, [topic.id, topic.status, topic.content?.presentationS3Key]);

  const handleToggleStatus = async () => {
    const nextStatus = status === 'published' ? 'draft' : 'published';
    setStatus(nextStatus);
    await onSaveContent({
      richText,
      presentationS3Key,
      presentationUrl,
      presentationFileName,
      presentationFileSize,
      presentationExtractedText,
      summaryText,
      summaryBullets,
    }, title, nextStatus);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const updatedContent: TopicContent = {
      richText,
      presentationS3Key,
      presentationUrl,
      presentationFileName,
      presentationFileSize,
      presentationExtractedText,
      summaryText,
      summaryBullets,
    };

    const saved = await onSaveContent(updatedContent, title, status);
    setSaving(false);
    setSaveSuccess(saved);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // ─── PRESENTATION UPLOAD HANDLERS ────────────────────────────

  const processFile = async (file: File) => {
    const allowed = ['.pptx', '.ppt', '.pdf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Allowed: .pptx, .ppt, .pdf`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File exceeds the 50 MB size limit.');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setUploadMsg('Uploading to AWS S3...');

    const result = await onUploadPresentation(topic.id, file);
    if (result) {
      const nextPresentationText = result.extractedText || '';
      setPresentationFileName(result.fileName);
      setPresentationS3Key(result.s3Key);
      setPresentationUrl(result.publicUrl);
      setPresentationFileSize(result.fileSize);
      setPresentationExtractedText(nextPresentationText);

      // Persist the attachment immediately. The upload response only stores the
      // object in S3; this update links its metadata to the LMS topic document.
      const attached = await onSaveContent({
        richText,
        presentationS3Key: result.s3Key,
        presentationUrl: result.publicUrl,
        presentationFileName: result.fileName,
        presentationFileSize: result.fileSize,
        presentationExtractedText: nextPresentationText,
        summaryText,
        summaryBullets,
      }, title, status);
      setUploadMsg(attached
        ? 'Presentation uploaded and attached to this topic.'
        : 'Presentation uploaded, but could not be attached. Please try Save Topic again.');
    } else {
      setUploadError('Upload failed. Check your connection or AWS configuration.');
      setUploadMsg('');
    }
    setIsUploading(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const handleFilePick = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) processFile(file);
  };

  // ─── SUMMARY HANDLERS ────────────────────────────────────────

  const handleGenerateSummary = async () => {
    if (!richText.trim() && !presentationFileName) {
      setUploadError('Add text content or upload a presentation first before generating a summary.');
      return;
    }
    setIsGeneratingSummary(true);

    if (onGenerateSummary) {
      const generated = await onGenerateSummary(richText, presentationExtractedText);
      if (generated) {
        setSummaryText(generated);
        setIsGeneratingSummary(false);
        return;
      }
    }

    // Generate auto-summary summarizing both text content and presentation inserted
    setTimeout(() => {
      const summaryParts: string[] = [];

      if (presentationFileName) {
        summaryParts.push(
          `Curriculum Presentation: Review the supplementary slide deck "${presentationFileName}" for diagrammatic and visual walkthroughs of this topic.`
        );
      }

      if (richText.trim()) {
        const plainText = richText.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
        const sentences = plainText
          .split(/[.!?\n]+/)
          .map(s => s.trim())
          .filter(s => s.length > 25);

        const extractedPoints = sentences.slice(0, 5).map(s => s.endsWith('.') ? s : s + '.');
        if (extractedPoints.length > 0) {
          summaryParts.push(...extractedPoints);
        }
      }

      if (presentationExtractedText.trim()) {
        const presentationPoints = presentationExtractedText
          .replace(/\s+/g, ' ')
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 25)
          .slice(0, 5)
          .map(s => `${s}.`);
        summaryParts.push(...presentationPoints);
      }

      const autoGenText = summaryParts.join('\n\n');

      if (autoGenText) {
        setSummaryText(prev => {
          const prefix = prev ? prev + '\n\n--- Auto-Generated Summary ---\n' : '';
          return prefix + autoGenText;
        });

        if (summaryBullets.length === 0) {
          const bullets = summaryParts
            .map(p => p.replace(/\n+/g, ' ').trim())
            .filter(Boolean)
            .slice(0, 4);
          setSummaryBullets(bullets);
        }
      }
      setIsGeneratingSummary(false);
    }, 700);
  };

  const addBullet = () => {
    if (!newBulletText.trim()) return;
    setSummaryBullets([...summaryBullets, newBulletText.trim()]);
    setNewBulletText('');
  };

  const removeBullet = (index: number) => {
    setSummaryBullets(summaryBullets.filter((_, i) => i !== index));
  };

  const TABS: { id: TabType; label: string }[] = [
    { id: 'text', label: 'Text Content' },
    { id: 'presentation', label: 'Presentation (AWS S3)' },
    { id: 'summary', label: 'Summary' },
  ];

  return (
    <View style={styles.cardContainer}>
      {/* Top Header */}
      <View style={styles.studioHeader}>
        <View style={styles.titleEditRow}>
          <TextInput
            style={styles.topicTitleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Topic Title..."
            placeholderTextColor={COLORS.textMuted}
          />
          <Pressable
            style={[styles.statusToggle, status === 'published' ? styles.statusPub : styles.statusDft]}
            onPress={handleToggleStatus}
          >
            <Text style={[styles.statusText, status === 'published' ? styles.statusTextPub : styles.statusTextDft]}>
              {status === 'published' ? 'PUBLISHED' : 'DRAFT'}
            </Text>
          </Pressable>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabNavRow}>
          {TABS.map(tab => (
            <Pressable
              key={tab.id}
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main Tab Body */}
      <View style={styles.studioBody}>

        {/* ── TAB 1: TEXT CONTENT ────────────────────────────── */}
        {activeTab === 'text' && (
          <View style={styles.tabPane}>
            <View style={styles.paneBanner}>
              <Text style={styles.paneBannerTitle}>Instructional Text & Lesson Prose</Text>
              <Text style={styles.paneBannerSub}>
                Author technical guidelines, syntax explanations, and learning material directly.
              </Text>
            </View>

            <RichTextEditor value={richText} onChange={setRichText} placeholder="Enter lesson text content..." />

            <View style={styles.charCountRow}>
              <Text style={styles.charCount}>
                {richText.trim().split(/\s+/).filter(Boolean).length} words
              </Text>
            </View>
          </View>
        )}

        {/* ── TAB 2: PRESENTATION (AWS S3) ───────────────────── */}
        {activeTab === 'presentation' && (
          <View style={styles.tabPane}>
            <View style={styles.paneBanner}>
              <Text style={styles.paneBannerTitle}>AWS S3 Presentation Storage</Text>
              <Text style={styles.paneBannerSub}>
                Upload lecture slides (.PPTX, .PDF). Files are stored securely on Amazon S3 and served via CDN.
              </Text>
            </View>

            {uploadError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{uploadError}</Text>
              </View>
            ) : null}

            {presentationS3Key ? (
              <>
              {/* ─ Attached File Card ─ */}
              <View style={styles.s3AttachedCard}>
                <View style={styles.s3FileInfo}>
                  <View style={styles.s3FileIconBox}>
                    <Text style={styles.s3FileIconText}>
                      {presentationFileName?.endsWith('.pdf') ? 'PDF' : 'PPT'}
                    </Text>
                  </View>
                  <View style={styles.s3MetaBox}>
                    <Text style={styles.s3FileName}>{presentationFileName}</Text>
                    <Text style={styles.s3KeyText}>S3 Key: {presentationS3Key}</Text>
                    <Text style={styles.s3UrlText} numberOfLines={1}>{presentationUrl}</Text>
                    <View style={styles.s3Row}>
                      <View style={styles.s3StatusPill}>
                        <Text style={styles.s3StatusText}>STORED — AWS S3 (AES-256)</Text>
                      </View>
                      {presentationFileSize > 0 && (
                        <Text style={styles.fileSizeText}>{formatFileSize(presentationFileSize)}</Text>
                      )}
                    </View>
                  </View>
                </View>
                <Pressable
                  style={styles.replaceBtn}
                  onPress={() => {
                    setPresentationS3Key('');
                    setPresentationUrl('');
                    setPresentationFileName('');
                    setPresentationFileSize(0);
                    setPresentationExtractedText('');
                    setUploadMsg('');
                    onSaveContent({
                      richText,
                      presentationS3Key: '',
                      presentationUrl: '',
                      presentationFileName: '',
                      presentationFileSize: 0,
                      presentationExtractedText: '',
                      summaryText,
                      summaryBullets,
                    }, title, status);
                  }}
                >
                  <Text style={styles.replaceBtnText}>Replace File</Text>
                </Pressable>
              </View>

              {/* Live Embedded Slide Presentation Viewer */}
              {presentationUrl ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 }}>
                    Live Presentation Preview & Presenter Mode
                  </Text>
                  <PresentationViewer
                    url={presentationUrl}
                    fileName={presentationFileName || `${title}.pptx`}
                    fileSize={presentationFileSize}
                    s3Key={presentationS3Key}
                    minHeight={500}
                  />
                </View>
              ) : null}
              </>
            ) : (
              /* ─ Drag & Drop Upload Zone ─ */
              Platform.OS === 'web' ? (
                <View
                  style={[styles.dropzone, isDragOver && styles.dropzoneActive]}
                  // @ts-ignore web-only props
                  onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Text style={styles.dropzoneIcon}>
                    {isUploading ? 'UPLOADING...' : isDragOver ? 'DROP FILE HERE' : 'DRAG & DROP'}
                  </Text>
                  <Text style={styles.dropzoneTitle}>
                    {isUploading ? 'Transferring to AWS S3...' : 'Drop your presentation file here'}
                  </Text>
                  <Text style={styles.dropzoneSubtitle}>Supported formats: .PPTX, .PPT, .PDF — Max 50 MB</Text>

                  {!isUploading && (
                    <>
                      <View style={styles.dropzoneOrRow}>
                        <View style={styles.dropzoneOrLine} />
                        <Text style={styles.dropzoneOrText}>or</Text>
                        <View style={styles.dropzoneOrLine} />
                      </View>
                      <Pressable
                        style={styles.browseBtn}
                        onPress={() => fileInputRef.current?.click()}
                      >
                        <Text style={styles.browseBtnText}>Browse File</Text>
                      </Pressable>
                      {/* @ts-ignore hidden input for web */}
                      <input
                        ref={fileInputRef as any}
                        type="file"
                        accept=".pptx,.ppt,.pdf"
                        style={{ display: 'none' }}
                        onChange={handleFilePick}
                      />
                    </>
                  )}

                  {uploadMsg ? (
                    <Text style={styles.uploadStatusLabel}>{uploadMsg}</Text>
                  ) : null}
                </View>
              ) : (
                /* Native fallback */
                <View style={styles.dropzone}>
                  <Text style={styles.dropzoneTitle}>File Upload</Text>
                  <Text style={styles.dropzoneSubtitle}>
                    Open this dashboard in a web browser to use drag-and-drop file upload.
                  </Text>
                </View>
              )
            )}
          </View>
        )}

        {/* ── TAB 3: SUMMARY ──────────────────────────────────── */}
        {activeTab === 'summary' && (
          <View style={styles.tabPane}>
            <View style={styles.paneBanner}>
              <Text style={styles.paneBannerTitle}>Lesson Summary & Key Takeaways</Text>
              <Text style={styles.paneBannerSub}>
                Write a summary manually, or auto-generate one from your text content.
              </Text>
            </View>

            {/* Summary Text Area (mirrors text content tab) */}
            <View style={styles.summarySection}>
              <View style={styles.summarySectionHeader}>
                <Text style={styles.summarySectionTitle}>LESSON SUMMARY</Text>
                <Pressable
                  style={[styles.autoGenBtn, isGeneratingSummary && styles.autoGenBtnDisabled]}
                  onPress={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  <Text style={styles.autoGenBtnText}>
                    {isGeneratingSummary ? 'Generating...' : 'Auto-Generate from Content'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.summaryHint}>
                Generate a draft from the lesson and presentation, then edit it freely with the same formatting tools.
              </Text>
              <RichTextEditor value={summaryText} onChange={setSummaryText} placeholder="Enter or generate a lesson summary..." minHeight={150} />
            </View>

            {/* Key Takeaway Bullets */}
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>KEY TAKEAWAY BULLETS</Text>
              <Text style={styles.summaryHint}>
                Add concise bullet points students should remember from this topic.
              </Text>

              <View style={styles.bulletList}>
                {summaryBullets.length === 0 ? (
                  <Text style={styles.emptyBulletsText}>No takeaway bullets added yet.</Text>
                ) : (
                  summaryBullets.map((b, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletContent}>{b}</Text>
                      <Pressable onPress={() => removeBullet(idx)} style={styles.removeBulletBtn}>
                        <Text style={styles.removeBulletText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.addBulletRow}>
                <TextInput
                  style={styles.bulletInput}
                  placeholder="Type a key takeaway..."
                  placeholderTextColor={COLORS.textMuted}
                  value={newBulletText}
                  onChangeText={setNewBulletText}
                  onSubmitEditing={addBullet}
                  returnKeyType="done"
                />
                <Button
                  title="Add"
                  variant="secondary"
                  size="sm"
                  onPress={addBullet}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Save Action Bar */}
      <View style={styles.studioFooter}>
        <View style={styles.saveNotice}>
          {saveSuccess && <Text style={styles.saveSuccessText}>All topic changes saved successfully.</Text>}
        </View>
        <Button
          title={saving ? 'Saving...' : 'Save Topic'}
          variant="primary"
          loading={saving}
          onPress={handleSave}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  studioHeader: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  titleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  topicTitleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPub: { backgroundColor: '#EAFAF1', borderColor: '#A9DFBF' },
  statusDft: { backgroundColor: '#FEF9E7', borderColor: '#F9E79F' },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusTextPub: { color: '#27AE60' },
  statusTextDft: { color: '#D35400' },
  tabNavRow: { flexDirection: 'row', gap: 4 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 14, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  tabButtonActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
  },
  tabLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary, fontWeight: '700' },
  studioBody: { padding: 16, backgroundColor: COLORS.white, minHeight: 280 },
  tabPane: { flex: 1 },
  paneBanner: { marginBottom: 14 },
  paneBannerTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  paneBannerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Text Content
  richToolbar: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F8F9FA',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EAECEF',
    flexWrap: 'wrap',
  },
  toolBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toolBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  richTextArea: {
    backgroundColor: '#FCFCFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 13,
    color: COLORS.text,
    minHeight: 220,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  charCountRow: { alignItems: 'flex-end', marginTop: 4 },
  charCount: { fontSize: 10, color: COLORS.textMuted },

  // Presentation Upload
  errorBanner: {
    backgroundColor: '#FDEDEC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FADBD8',
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
  dropzone: {
    backgroundColor: '#FCFCFC',
    borderWidth: 2,
    borderColor: '#DDE2EA',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 200,
  },
  dropzoneActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FEF5F5',
  },
  dropzoneIcon: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.primary,
    marginBottom: 4,
  },
  dropzoneTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dropzoneSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  dropzoneOrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  dropzoneOrLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dropzoneOrText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  browseBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  browseBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  uploadStatusLabel: { fontSize: 12, color: '#27AE60', fontWeight: '700', marginTop: 8 },
  s3AttachedCard: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    gap: 14,
  },
  s3FileInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  s3FileIconBox: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  s3FileIconText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  s3MetaBox: { flex: 1 },
  s3FileName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  s3KeyText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 3, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  s3UrlText: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  s3Row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  s3StatusPill: {
    backgroundColor: '#EAFAF1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  s3StatusText: { fontSize: 10, fontWeight: '700', color: '#27AE60' },
  fileSizeText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  replaceBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  replaceBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  // Summary
  summarySection: {
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  summarySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summarySectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  autoGenBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  autoGenBtnDisabled: { opacity: 0.5 },
  autoGenBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  summaryHint: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10 },
  summaryTextArea: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 13,
    color: COLORS.text,
    minHeight: 130,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  bulletList: { marginBottom: 12 },
  emptyBulletsText: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 6 },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    flexShrink: 0,
  },
  bulletContent: { flex: 1, fontSize: 12, color: COLORS.text },
  removeBulletBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  removeBulletText: { fontSize: 10, color: COLORS.error, fontWeight: '700' },
  addBulletRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bulletInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    color: COLORS.text,
  },

  // Footer
  studioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveNotice: { flex: 1 },
  saveSuccessText: { fontSize: 11, fontWeight: '700', color: '#27AE60' },
  saveButton: { paddingHorizontal: 20 },
});
