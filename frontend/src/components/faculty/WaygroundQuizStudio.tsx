import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { WaygroundQuiz, QuizQuestion } from '@/types/faculty';
import { Button } from '@/components/ui/Button';

interface WaygroundQuizStudioProps {
  quiz?: WaygroundQuiz;
  token: string | null;
  onSaveQuiz: (quiz: WaygroundQuiz) => Promise<void>;
  onUploadQuizDocument: (file: File) => Promise<{ extractedText: string; fileName: string } | null>;
}

export function WaygroundQuizStudio({
  quiz,
  token,
  onSaveQuiz,
  onUploadQuizDocument,
}: WaygroundQuizStudioProps) {
  // Quiz Configuration State
  const [title, setTitle] = useState(quiz?.title || 'Topic Knowledge Assessment');
  const [hasTimer, setHasTimer] = useState(quiz?.hasTimer ?? true);
  const [durationMinutes, setDurationMinutes] = useState(
    quiz?.durationMinutes && quiz.durationMinutes >= 10 && quiz.durationMinutes <= 20
      ? quiz.durationMinutes
      : 15
  );
  const [passingScorePercent, setPassingScorePercent] = useState(quiz?.passingScorePercent || 75);
  const [shuffleQuestions, setShuffleQuestions] = useState(quiz?.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(quiz?.shuffleOptions ?? true);

  const [durationError, setDurationError] = useState('');
  const [passingScoreError, setPassingScoreError] = useState('');

  // Questions List (Strictly Multiple Choice)
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.questions || []);

  // Form State for Adding/Editing Multiple Choice Question
  const [prompt, setPrompt] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [selectedCorrectIndex, setSelectedCorrectIndex] = useState(0); // 0 = A, 1 = B, 2 = C, 3 = D
  const [explanation, setExplanation] = useState('');
  const [points, setPoints] = useState('1');

  // Saving states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Document upload state (for quiz extraction)
  const [quizDocMode, setQuizDocMode] = useState<'manual' | 'upload'>('manual');
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [docUploadMsg, setDocUploadMsg] = useState('');
  const [docUploadError, setDocUploadError] = useState('');
  const [extractedRawText, setExtractedRawText] = useState('');
  const [isDragOverQuiz, setIsDragOverQuiz] = useState(false);
  const quizFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitle(quiz?.title || 'Topic Knowledge Assessment');
    setHasTimer(quiz?.hasTimer ?? true);
    setDurationMinutes(
      quiz?.durationMinutes && quiz.durationMinutes >= 10 && quiz.durationMinutes <= 20
        ? quiz.durationMinutes
        : 15
    );
    setPassingScorePercent(quiz?.passingScorePercent || 75);
    setShuffleQuestions(quiz?.shuffleQuestions ?? true);
    setShuffleOptions(quiz?.shuffleOptions ?? true);
    setQuestions(quiz?.questions || []);
    setDurationError('');
    setPassingScoreError('');
  }, [quiz]);

  const handleDurationChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (isNaN(num)) {
      setDurationMinutes(0);
      setDurationError('Please enter a valid number (10 - 20 minutes)');
      return;
    }
    setDurationMinutes(num);
    if (num < 10) {
      setDurationError('Time limit must be at least 10 minutes.');
    } else if (num > 20) {
      setDurationError('Time limit cannot exceed 20 minutes.');
    } else {
      setDurationError('');
    }
  };

  const handlePassingScoreChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (isNaN(num)) {
      setPassingScorePercent(0);
      setPassingScoreError('Please enter a valid percentage (1 - 100)');
      return;
    }
    setPassingScorePercent(num);
    if (num < 1 || num > 100) {
      setPassingScoreError('Passing score must be between 1% and 100%.');
    } else {
      setPassingScoreError('');
    }
  };

  // ─── QUIZ DOCUMENT HANDLERS ──────────────────────────────────

  const processQuizDoc = async (file: File) => {
    const allowed = ['.pdf', '.docx', '.txt', '.pptx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setDocUploadError(`Unsupported file type "${ext}". Allowed: .pdf, .docx, .txt, .pptx`);
      return;
    }

    setDocUploadError('');
    setIsExtractingDoc(true);
    setDocUploadMsg('Uploading and extracting text from document...');

    const result = await onUploadQuizDocument(file);
    if (result && result.extractedText) {
      setExtractedRawText(result.extractedText);
      setDocUploadMsg(`Text extracted successfully from "${result.fileName}". Review below and add questions.`);
    } else {
      setDocUploadError('Could not extract readable text from the document. Ensure it contains selectable text.');
      setDocUploadMsg('');
    }
    setIsExtractingDoc(false);
  };

  const handleQuizDocDrop = (e: any) => {
    e.preventDefault();
    setIsDragOverQuiz(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processQuizDoc(file);
  };

  const handleQuizFilePick = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) processQuizDoc(file);
  };

  const handleParseExtractedQuestions = () => {
    if (!extractedRawText.trim()) return;

    const parsedQuestions: QuizQuestion[] = [];
    // Split into question blocks
    const blocks = extractedRawText.split(/\n\s*(?:(?:Q|Question)?\s*\d+[\.\:\)]|\d+\.\s+)/i);

    for (const rawBlock of blocks) {
      const block = rawBlock.trim();
      if (block.length < 15) continue;

      // Match options A, B, C, D
      const optAMatch = block.match(/(?:^|\n)\s*[A|a][\.\)]\s*([^\n]+)/);
      const optBMatch = block.match(/(?:^|\n)\s*[B|b][\.\)]\s*([^\n]+)/);
      const optCMatch = block.match(/(?:^|\n)\s*[C|c][\.\)]\s*([^\n]+)/);
      const optDMatch = block.match(/(?:^|\n)\s*[D|d][\.\)]\s*([^\n]+)/);

      let questionPrompt = block.split(/(?:^|\n)\s*[A-Da-d][\.\)]/)[0].trim();
      if (!questionPrompt) {
        questionPrompt = block.split('\n')[0].trim();
      }

      const options: string[] = [];
      if (optAMatch) options.push(optAMatch[1].trim());
      if (optBMatch) options.push(optBMatch[1].trim());
      if (optCMatch) options.push(optCMatch[1].trim());
      if (optDMatch) options.push(optDMatch[1].trim());

      if (options.length >= 2 && questionPrompt.length > 5) {
        const ansMatch = block.match(/(?:Answer|Ans|Key|Correct(?:\s+Answer)?)\s*[:\-\s]+([^\n]+)/i);
        let correctIdx = 0;
        if (ansMatch) {
          const answerValue = ansMatch[1].trim();
          const letter = answerValue.charAt(0).toUpperCase();
          if (letter === 'A') correctIdx = 0;
          else if (letter === 'B') correctIdx = 1;
          else if (letter === 'C') correctIdx = 2;
          else if (letter === 'D') correctIdx = 3;
          else {
            const answerIndex = options.findIndex(option => option.toLowerCase() === answerValue.toLowerCase());
            if (answerIndex >= 0) correctIdx = answerIndex;
          }
        }

        parsedQuestions.push({
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'multiple_choice',
          prompt: questionPrompt,
          options,
          correctAnswer: options[correctIdx] || options[0],
          points: 1,
        });
      }
    }

    if (parsedQuestions.length > 0) {
      setQuestions(prev => [...prev, ...parsedQuestions]);
      setDocUploadMsg(`Successfully extracted and created ${parsedQuestions.length} multiple choice questions.`);
      setQuizDocMode('manual');
    } else {
      const firstPara = extractedRawText.split(/\n\s*\n/)[0].trim();
      setPrompt(firstPara.slice(0, 200));
      setDocUploadMsg('Auto-parsing completed: First question prompt pre-filled in manual form below.');
      setQuizDocMode('manual');
    }
  };

  const handleAddQuestion = () => {
    if (!prompt.trim()) return;
    const options = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()].filter(Boolean);
    if (options.length < 2) return;

    const correctAnswer = options[selectedCorrectIndex] || options[0];

    const newQ: QuizQuestion = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      prompt: prompt.trim(),
      options,
      correctAnswer,
      explanation: explanation.trim(),
      points: Number(points) || 1,
    };

    setQuestions([...questions, newQ]);

    // Reset inputs
    setPrompt('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setSelectedCorrectIndex(0);
    setExplanation('');
    setPoints('1');
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSaveQuiz = async () => {
    if (hasTimer && (durationMinutes < 10 || durationMinutes > 20)) {
      setDurationError('Duration must be between 10 and 20 minutes.');
      return;
    }
    if (passingScorePercent < 1 || passingScorePercent > 100) {
      setPassingScoreError('Passing score must be between 1% and 100%.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    const payload: WaygroundQuiz = {
      title,
      hasTimer,
      durationMinutes: hasTimer ? durationMinutes : 15,
      passingScorePercent,
      shuffleQuestions,
      shuffleOptions,
      questions,
    };

    await onSaveQuiz(payload);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

  return (
    <View style={styles.container}>
      {/* Studio Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Assessment Studio (Multiple Choice Only)</Text>
          <Text style={styles.headerSubtitle}>
            Configure assessment timing, passing percentage threshold, question shuffling, and individual test items.
          </Text>
        </View>

        {/* Global Controls Grid */}
        <View style={styles.controlsGrid}>
          {/* Timer Settings */}
          <View style={styles.controlCard}>
            <View style={styles.switchHeader}>
              <Text style={styles.cardHeading}>ASSESSMENT TIMER</Text>
              <Switch
                value={hasTimer}
                onValueChange={setHasTimer}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              />
            </View>

            {hasTimer ? (
              <>
                <View style={styles.inputInlineRow}>
                  <Text style={styles.inputLabel}>Duration Limit:</Text>
                  <TextInput
                    style={[styles.smallInput, !!durationError && styles.inputError]}
                    keyboardType="numeric"
                    value={String(durationMinutes)}
                    onChangeText={handleDurationChange}
                  />
                  <Text style={styles.inputUnit}>Minutes</Text>
                </View>
                {durationError ? (
                  <Text style={styles.errorCaption}>{durationError}</Text>
                ) : (
                  <Text style={styles.captionText}>Range: 10 to 20 minutes</Text>
                )}
              </>
            ) : (
              <Text style={styles.captionMuted}>Timer disabled (Untimed submission)</Text>
            )}
          </View>

          {/* Passing Score Settings */}
          <View style={styles.controlCard}>
            <Text style={styles.cardHeading}>PASSING SCORE THRESHOLD</Text>
            <View style={styles.inputInlineRow}>
              <Text style={styles.inputLabel}>Minimum Score:</Text>
              <TextInput
                style={[styles.smallInput, !!passingScoreError && styles.inputError]}
                keyboardType="numeric"
                value={String(passingScorePercent)}
                onChangeText={handlePassingScoreChange}
              />
              <Text style={styles.inputUnit}>%</Text>
            </View>
            {passingScoreError ? (
              <Text style={styles.errorCaption}>{passingScoreError}</Text>
            ) : (
              <Text style={styles.captionText}>Students must meet this threshold to pass.</Text>
            )}
          </View>

          {/* Shuffling Options */}
          <View style={styles.controlCard}>
            <Text style={styles.cardHeading}>RANDOMIZATION</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Shuffle Questions:</Text>
              <Switch
                value={shuffleQuestions}
                onValueChange={setShuffleQuestions}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Shuffle Choices:</Text>
              <Switch
                value={shuffleOptions}
                onValueChange={setShuffleOptions}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Main Body */}
      <View style={styles.body}>

        {/* QUESTION INPUT MODE SELECTOR */}
        <View style={styles.modeSelector}>
          <Pressable
            style={[styles.modeBtn, quizDocMode === 'manual' && styles.modeBtnActive]}
            onPress={() => setQuizDocMode('manual')}
          >
            <Text style={[styles.modeBtnText, quizDocMode === 'manual' && styles.modeBtnTextActive]}>
              Manual Entry
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, quizDocMode === 'upload' && styles.modeBtnActive]}
            onPress={() => setQuizDocMode('upload')}
          >
            <Text style={[styles.modeBtnText, quizDocMode === 'upload' && styles.modeBtnTextActive]}>
              Upload Document & Extract
            </Text>
          </Pressable>
        </View>

        {/* DOCUMENT UPLOAD MODE */}
        {quizDocMode === 'upload' && (
          <View style={styles.docUploadSection}>
            <View style={styles.docUploadHeader}>
              <Text style={styles.docUploadTitle}>Document Upload — Quiz Text Extraction</Text>
              <Text style={styles.docUploadSub}>
                Upload a PDF, DOCX, PPTX, or TXT file. The system will extract the text content for you to review
                and manually create quiz questions from.
              </Text>
            </View>

            {docUploadError ? (
              <View style={styles.docErrorBanner}>
                <Text style={styles.docErrorText}>{docUploadError}</Text>
              </View>
            ) : null}

            {Platform.OS === 'web' ? (
              <View
                style={[styles.docDropzone, isDragOverQuiz && styles.docDropzoneActive]}
                // @ts-ignore web-only
                onDragOver={(e: any) => { e.preventDefault(); setIsDragOverQuiz(true); }}
                onDragLeave={() => setIsDragOverQuiz(false)}
                onDrop={handleQuizDocDrop}
              >
                <Text style={styles.docDropzoneLabel}>
                  {isExtractingDoc ? 'EXTRACTING TEXT...' : isDragOverQuiz ? 'RELEASE TO UPLOAD' : 'DRAG & DROP DOCUMENT'}
                </Text>
                <Text style={styles.docDropzoneSubtitle}>Supported: .PDF, .DOCX, .PPTX, .TXT — Max 10 MB</Text>

                {!isExtractingDoc && (
                  <>
                    <View style={styles.dropzoneOrRow}>
                      <View style={styles.dropzoneOrLine} />
                      <Text style={styles.dropzoneOrText}>or</Text>
                      <View style={styles.dropzoneOrLine} />
                    </View>
                    <Pressable
                      style={styles.browseBtn}
                      onPress={() => quizFileInputRef.current?.click()}
                    >
                      <Text style={styles.browseBtnText}>Browse File</Text>
                    </Pressable>
                    {/* @ts-ignore */}
                    <input
                      ref={quizFileInputRef as any}
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt"
                      style={{ display: 'none' }}
                      onChange={handleQuizFilePick}
                    />
                  </>
                )}
              </View>
            ) : (
              <View style={styles.docDropzone}>
                <Text style={styles.docDropzoneLabel}>FILE UPLOAD</Text>
                <Text style={styles.docDropzoneSubtitle}>Open in a web browser to use document upload.</Text>
              </View>
            )}

            {docUploadMsg ? (
              <Text style={styles.docUploadSuccess}>{docUploadMsg}</Text>
            ) : null}

            {extractedRawText ? (
              <View style={styles.extractedTextCard}>
                <View style={styles.extractedTextHeader}>
                  <Text style={styles.extractedTextTitle}>EXTRACTED TEXT CONTENT</Text>
                  <Text style={styles.extractedTextHint}>
                    Review the content below. Switch to Manual Entry to create questions from this material.
                  </Text>
                </View>
                <TextInput
                  style={styles.extractedTextArea}
                  multiline
                  value={extractedRawText}
                  onChangeText={setExtractedRawText}
                  textAlignVertical="top"
                  scrollEnabled
                />
                <View style={styles.extractedActionsRow}>
                  <Pressable
                    style={styles.parseQuestionsBtn}
                    onPress={handleParseExtractedQuestions}
                  >
                    <Text style={styles.parseQuestionsText}>Auto-Transform into Multiple Choice Questions</Text>
                  </Pressable>
                  <Pressable
                    style={styles.switchToManualBtn}
                    onPress={() => setQuizDocMode('manual')}
                  >
                    <Text style={styles.switchToManualText}>Switch to Manual Entry</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* ADD NEW QUESTION FORM */}
        <View style={[styles.formContainer, quizDocMode === 'upload' && extractedRawText && styles.formContainerCollapsed]}>
          <Text style={styles.formSectionTitle}>Create Multiple Choice Question</Text>

          <Text style={styles.fieldLabel}>Question Statement</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Type question prompt..."
            placeholderTextColor={COLORS.textMuted}
            value={prompt}
            onChangeText={setPrompt}
          />

          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
            Answer Choices (Select the radio indicator for the correct choice)
          </Text>

          {/* Choice A */}
          <View style={styles.choiceRow}>
            <Pressable
              style={[styles.radioCircle, selectedCorrectIndex === 0 && styles.radioCircleActive]}
              onPress={() => setSelectedCorrectIndex(0)}
            >
              {selectedCorrectIndex === 0 && <View style={styles.radioDot} />}
            </Pressable>
            <Text style={styles.choiceLetter}>A.</Text>
            <TextInput
              style={styles.choiceInput}
              placeholder="Choice A text"
              value={optionA}
              onChangeText={setOptionA}
            />
          </View>

          {/* Choice B */}
          <View style={styles.choiceRow}>
            <Pressable
              style={[styles.radioCircle, selectedCorrectIndex === 1 && styles.radioCircleActive]}
              onPress={() => setSelectedCorrectIndex(1)}
            >
              {selectedCorrectIndex === 1 && <View style={styles.radioDot} />}
            </Pressable>
            <Text style={styles.choiceLetter}>B.</Text>
            <TextInput
              style={styles.choiceInput}
              placeholder="Choice B text"
              value={optionB}
              onChangeText={setOptionB}
            />
          </View>

          {/* Choice C */}
          <View style={styles.choiceRow}>
            <Pressable
              style={[styles.radioCircle, selectedCorrectIndex === 2 && styles.radioCircleActive]}
              onPress={() => setSelectedCorrectIndex(2)}
            >
              {selectedCorrectIndex === 2 && <View style={styles.radioDot} />}
            </Pressable>
            <Text style={styles.choiceLetter}>C.</Text>
            <TextInput
              style={styles.choiceInput}
              placeholder="Choice C text (optional)"
              value={optionC}
              onChangeText={setOptionC}
            />
          </View>

          {/* Choice D */}
          <View style={styles.choiceRow}>
            <Pressable
              style={[styles.radioCircle, selectedCorrectIndex === 3 && styles.radioCircleActive]}
              onPress={() => setSelectedCorrectIndex(3)}
            >
              {selectedCorrectIndex === 3 && <View style={styles.radioDot} />}
            </Pressable>
            <Text style={styles.choiceLetter}>D.</Text>
            <TextInput
              style={styles.choiceInput}
              placeholder="Choice D text (optional)"
              value={optionD}
              onChangeText={setOptionD}
            />
          </View>

          <View style={styles.metaInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Explanation / Key Rationale (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Explain the correct answer..."
                placeholderTextColor={COLORS.textMuted}
                value={explanation}
                onChangeText={setExplanation}
              />
            </View>
            <View style={{ width: 80 }}>
              <Text style={styles.fieldLabel}>Points</Text>
              <TextInput
                style={[styles.formInput, { textAlign: 'center' }]}
                keyboardType="numeric"
                value={points}
                onChangeText={setPoints}
              />
            </View>
          </View>

          <Button
            title="+ Add Question to Assessment"
            variant="primary"
            size="sm"
            onPress={handleAddQuestion}
            style={{ marginTop: 14, alignSelf: 'flex-start' }}
          />
        </View>

        {/* QUESTIONS LIST */}
        <View style={styles.questionsListSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>Assessment Questions ({questions.length})</Text>
            <Text style={styles.totalPointsText}>Total Score: {totalPoints} Points</Text>
          </View>

          {questions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Questions Configured</Text>
              <Text style={styles.emptySub}>
                Use the form above to add multiple choice questions to this topic assessment.
              </Text>
            </View>
          ) : (
            questions.map((q, idx) => (
              <View key={q.id} style={styles.qCard}>
                <View style={styles.qCardTop}>
                  <Text style={styles.qIndexText}>Question {idx + 1}</Text>
                  <Text style={styles.qPointsText}>{q.points} pt</Text>
                  <Pressable
                    style={styles.qDeleteBtn}
                    onPress={() => handleDeleteQuestion(q.id)}
                  >
                    <Text style={styles.qDeleteText}>Delete</Text>
                  </Pressable>
                </View>

                <Text style={styles.qPrompt}>{q.prompt}</Text>

                <View style={styles.optionsList}>
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = String(q.correctAnswer).toLowerCase() === opt.toLowerCase();
                    return (
                      <Pressable
                        key={optIdx}
                        style={[styles.optionItem, isCorrect && styles.optionItemCorrect]}
                        onPress={() => setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, correctAnswer: opt } : item))}
                      >
                        <Text style={[styles.optIndicator, isCorrect && styles.optIndicatorCorrect]}>
                          {isCorrect ? '[CORRECT]' : `(${String.fromCharCode(65 + optIdx)})`}
                        </Text>
                        <Text style={[styles.optText, isCorrect && styles.optTextCorrect]}>
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.correctAnswerHint}>Tap an option to choose the correct answer. The detected answer is highlighted.</Text>

                {q.explanation ? (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationText}>Rationale: {q.explanation}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerNotice}>
          {saveSuccess && <Text style={styles.saveSuccessText}>Assessment saved successfully.</Text>}
          {durationError ? <Text style={styles.saveErrText}>{durationError}</Text> : null}
          {passingScoreError ? <Text style={styles.saveErrText}>{passingScoreError}</Text> : null}
        </View>
        <Button
          title={saving ? "Saving Assessment..." : "Save Assessment"}
          variant="primary"
          loading={saving}
          disabled={Boolean(durationError || passingScoreError)}
          onPress={handleSaveQuiz}
          style={styles.saveBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 32,
  },
  header: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 16,
  },
  headerTitleRow: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  controlsGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  controlCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
  },
  cardHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  switchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  smallInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    width: 52,
    textAlign: 'center',
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: '#FADBD8',
  },
  inputUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  captionText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  captionMuted: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorCaption: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '700',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  body: {
    padding: 16,
  },
  formContainer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: COLORS.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: COLORS.text,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  choiceLetter: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    width: 14,
  },
  choiceInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    color: COLORS.text,
  },
  metaInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  questionsListSection: {
    marginTop: 6,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalPointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  qCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  qCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  qIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  qPointsText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  qDeleteBtn: {
    marginLeft: 'auto',
  },
  qDeleteText: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: '600',
  },
  qPrompt: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 16,
    marginBottom: 6,
  },
  optionsList: {
    gap: 4,
    marginVertical: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  optionItemCorrect: {
    backgroundColor: '#EAFAF1',
    borderWidth: 1,
    borderColor: '#A9DFBF',
  },
  optIndicator: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  optIndicatorCorrect: {
    color: '#27AE60',
  },
  optText: {
    fontSize: 11,
    color: COLORS.text,
    flex: 1,
  },
  optTextCorrect: {
    color: '#1E8449',
    fontWeight: '700',
  },
  correctAnswerHint: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 5,
  },
  explanationBox: {
    backgroundColor: '#FEF9E7',
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
  },
  explanationText: {
    fontSize: 10,
    color: '#7D6608',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerNotice: { flex: 1 },
  saveSuccessText: { fontSize: 11, fontWeight: '700', color: '#27AE60' },
  saveErrText: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  saveBtn: { paddingHorizontal: 18 },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 3,
    alignSelf: 'flex-start',
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 5,
  },
  modeBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  modeBtnTextActive: { color: COLORS.text, fontWeight: '700' },

  // Document Upload
  docUploadSection: {
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
  },
  docUploadHeader: { marginBottom: 14 },
  docUploadTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  docUploadSub: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 17 },
  docErrorBanner: {
    backgroundColor: '#FDEDEC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  docErrorText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
  docDropzone: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: '#DDE2EA',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 160,
  },
  docDropzoneActive: { borderColor: COLORS.primary, backgroundColor: '#FEF5F5' },
  docDropzoneLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.primary,
    marginBottom: 2,
  },
  docDropzoneSubtitle: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  dropzoneOrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  dropzoneOrLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dropzoneOrText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  browseBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  browseBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  docUploadSuccess: { fontSize: 12, color: '#27AE60', fontWeight: '700', marginTop: 10 },
  extractedTextCard: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  extractedTextHeader: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  extractedTextTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  extractedTextHint: { fontSize: 11, color: COLORS.textSecondary },
  extractedTextArea: {
    padding: 12,
    fontSize: 12,
    color: COLORS.text,
    minHeight: 180,
    maxHeight: 280,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: COLORS.white,
  },
  extractedActionsRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
  },
  parseQuestionsBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  parseQuestionsText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
  },
  switchToManualBtn: {
    padding: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  switchToManualText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  formContainerCollapsed: { opacity: 0.7 },
});
