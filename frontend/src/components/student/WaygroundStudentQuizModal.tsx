import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { StudentQuiz, StudentQuizQuestion } from '@/services/studentApi';
import { Button } from '@/components/ui/Button';

interface WaygroundStudentQuizModalProps {
  visible: boolean;
  quiz: StudentQuiz;
  topicTitle: string;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => Promise<{
    success: boolean;
    passed?: boolean;
    scorePercent?: number;
    passingScorePercent?: number;
    correctCount?: number;
    totalQuestions?: number;
    earnedPoints?: number;
    totalPossiblePoints?: number;
    totalScore?: string;
    attemptsCount?: number;
    unlockedNextTopic?: boolean;
  }>;
  onReviewContent: () => void;
  onProceedToNextTopic: () => void;
}

export function WaygroundStudentQuizModal({
  visible,
  quiz,
  topicTitle,
  onClose,
  onSubmit,
  onReviewContent,
  onProceedToNextTopic,
}: WaygroundStudentQuizModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const selectedAnswersRef = useRef<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(
    (quiz.hasTimer ? quiz.durationMinutes || 15 : 15) * 60
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    submitted: boolean;
    passed: boolean;
    scorePercent: number;
    passingScorePercent: number;
    correctCount: number;
    totalQuestions: number;
    earnedPoints: number;
    totalPossiblePoints: number;
    totalScore: string;
    attemptsCount: number;
  } | null>(null);

  const questions: StudentQuizQuestion[] = quiz.questions || [];
  const currentQuestion: StudentQuizQuestion | undefined = questions[currentSlideIndex];
  const totalQuestions = questions.length;

  // Reset the attempt only when the modal opens. The parent refreshes the quiz
  // object after submission; that refresh must not erase the result screen.
  useEffect(() => {
    if (visible) {
      setCurrentSlideIndex(0);
      setSelectedAnswers({});
      selectedAnswersRef.current = {};
      setResult(null);
      setTimeLeftSeconds((quiz.hasTimer ? quiz.durationMinutes || 15 : 15) * 60);
    }
  // The quiz is intentionally read from the opening render. A changed quiz
  // object while visible represents the post-submit progress refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Countdown Timer
  useEffect(() => {
    if (!visible || !quiz.hasTimer || result?.submitted) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, quiz.hasTimer, result?.submitted]);

  const handleAutoSubmit = () => {
    if (!result?.submitted) {
      handleFinalSubmit();
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    const nextAnswers = {
      ...selectedAnswersRef.current,
      [questionId]: option,
    };
    selectedAnswersRef.current = nextAnswers;
    setSelectedAnswers(nextAnswers);
  };

  const handleNext = () => {
    if (currentSlideIndex < totalQuestions - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    const answers = selectedAnswersRef.current;
    setSubmitting(true);
    const res = await onSubmit(answers);
    setSubmitting(false);

    if (res.success) {
      setResult({
        submitted: true,
        passed: Boolean(res.passed),
        scorePercent: res.scorePercent ?? 0,
        passingScorePercent: res.passingScorePercent ?? quiz.passingScorePercent ?? 75,
        correctCount: res.correctCount ?? 0,
        totalQuestions: res.totalQuestions ?? totalQuestions,
        earnedPoints: res.earnedPoints ?? 0,
        totalPossiblePoints: res.totalPossiblePoints ?? questions.reduce((sum, question) => sum + (question.points || 1), 0),
        totalScore: res.totalScore ?? `${res.correctCount ?? 0} / ${res.totalQuestions ?? totalQuestions} Correct`,
        attemptsCount: res.attemptsCount ?? 1,
      });
    }
  };

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const timerRatio = quiz.hasTimer
    ? timeLeftSeconds / ((quiz.durationMinutes || 15) * 60)
    : 1;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.fullscreenContainer}>
        {/* Top Wayground Header */}
        <View style={styles.quizHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.quizBrand}>WAYGROUND ASSESSMENT ENGINE</Text>
            <Text style={styles.topicHeaderTitle} numberOfLines={1}>{topicTitle}</Text>
          </View>

          {/* Visual Countdown Timer */}
          {quiz.hasTimer && !result?.submitted && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>REMAINING TIME</Text>
              <View style={[
                styles.timerBox,
                timeLeftSeconds < 120 ? styles.timerCritical : timeLeftSeconds < 300 ? styles.timerWarning : null
              ]}>
                <Text style={[
                  styles.timerText,
                  timeLeftSeconds < 120 ? styles.timerTextCritical : timeLeftSeconds < 300 ? styles.timerTextWarning : null
                ]}>
                  {formatTime(timeLeftSeconds)}
                </Text>
              </View>
            </View>
          )}

          {!result?.submitted && (
            <Pressable style={styles.exitBtn} onPress={onClose}>
              <Text style={styles.exitBtnText}>Exit Assessment</Text>
            </Pressable>
          )}
        </View>

        {/* Persistent Progress Bar Across Top */}
        {!result?.submitted && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${((currentSlideIndex + 1) / totalQuestions) * 100}%` },
              ]}
            />
          </View>
        )}

        {/* ─── RESULT VIEW: HARD GATES EVALUATION ──────────────── */}
        {result?.submitted ? (
          <ScrollView contentContainerStyle={styles.resultContainer}>
            <View style={[styles.resultCard, result.passed ? styles.cardPassed : styles.cardFailed]}>
              <View style={[styles.resultBanner, result.passed ? styles.bannerPassed : styles.bannerFailed]}>
                <Text style={styles.resultBannerIcon}>{result.passed ? '✓' : '!'}</Text>
                <View style={styles.resultBannerCopy}>
                  <Text style={[styles.resultBadgeText, result.passed ? styles.badgeTextPassed : styles.badgeTextFailed]}>
                    {result.passed ? 'ASSESSMENT PASSED' : 'MASTERY BENCHMARK NOT MET'}
                  </Text>
                  <Text style={styles.resultBannerMessage}>
                    {result.passed ? 'Great work — your next topic is unlocked.' : "Don't worry, let's try again!"}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>YOUR SCORE</Text>
                  <Text style={styles.metricValue}>{result.correctCount} / {result.totalQuestions}</Text>
                  <Text style={styles.metricSubtext}>Correct answers</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>YOUR GRADE</Text>
                  <View style={styles.gradeRow}>
                    <View style={styles.progressRing}>
                      <View style={styles.progressRingInner}>
                        <Text style={styles.progressRingText}>{result.scorePercent}%</Text>
                      </View>
                    </View>
                    <Text style={styles.metricSubtext}>Earned percentage</Text>
                  </View>
                </View>
              </View>

              <View style={styles.benchmarkRow}>
                <Text style={styles.benchmarkLabel}>Passing Score Required:</Text>
                <Text style={styles.benchmarkVal}>{result.passingScorePercent}%</Text>
              </View>
              <Text style={styles.pointsDetail}>
                Weighted points: {result.earnedPoints} / {result.totalPossiblePoints}
              </Text>
              <Text style={styles.pointsDetail}>Attempt {result.attemptsCount}</Text>

              <View style={styles.divider} />

              <Text style={styles.resultOutcomeText}>
                {result.passed
                  ? 'Congratulations! You have satisfied the mastery criteria. The subsequent lesson in the course curriculum tree is now unlocked.'
                  : 'You did not achieve the required passing threshold. In accordance with curriculum policy, the subsequent module remains locked. Please review the topic instructional text and slides before attempting again.'}
              </Text>

              <View style={styles.resultActionsRow}>
                {result.passed ? (
                  <Button
                    title="Proceed to Next Module"
                    variant="primary"
                    size="lg"
                    onPress={onProceedToNextTopic}
                  />
                ) : (
                  <Button
                    title="Review Content & Retake Quiz"
                    variant="secondary"
                    size="lg"
                    onPress={() => {
                      onClose();
                      onReviewContent();
                    }}
                  />
                )}
              </View>
            </View>
          </ScrollView>
        ) : (
          /* ─── SLIDE-BY-SLIDE QUESTION RUNNER ───────────────────── */
          <View style={styles.questionSlideContainer}>
            {totalQuestions === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Questions Configured</Text>
                <Text style={styles.emptySub}>The instructor has not added questions to this topic assessment yet.</Text>
                <Button title="Close" variant="secondary" size="md" onPress={onClose} style={{ marginTop: 16 }} />
              </View>
            ) : currentQuestion ? (
              <ScrollView contentContainerStyle={styles.questionSlideContent}>
                {/* Slide Tracker Badge */}
                <View style={styles.slideTrackerRow}>
                  <Text style={styles.slideCounter}>
                    Question {currentSlideIndex + 1} of {totalQuestions}
                  </Text>
                  <Text style={styles.pointWeight}>
                    Weight: {currentQuestion.points || 1} point
                  </Text>
                </View>

                {/* Question Prompt */}
                <View style={styles.promptCard}>
                  <Text style={styles.promptText}>{currentQuestion.prompt}</Text>
                </View>

                {/* Multiple Choice Options List */}
                <View style={styles.optionsList}>
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === option;
                    const optionLetter = String.fromCharCode(65 + idx);

                    return (
                      <Pressable
                        key={idx}
                        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                        onPress={() => handleSelectOption(currentQuestion.id, option)}
                      >
                        <View style={[styles.optionIndicator, isSelected && styles.optionIndicatorSelected]}>
                          <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                            {optionLetter}
                          </Text>
                        </View>
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            {/* Bottom Navigation & Submission Bar */}
            {totalQuestions > 0 && !result?.submitted && (
              <View style={styles.navBar}>
                <Button
                  title="Previous"
                  variant="secondary"
                  size="md"
                  disabled={currentSlideIndex === 0}
                  onPress={handlePrevious}
                />

                <View style={styles.answeredStatus}>
                  <Text style={styles.answeredText}>
                    {Object.keys(selectedAnswers).length} of {totalQuestions} answered
                  </Text>
                </View>

                {currentSlideIndex === totalQuestions - 1 ? (
                  <Button
                    title={submitting ? 'Evaluating...' : 'Submit Assessment'}
                    variant="primary"
                    size="md"
                    loading={submitting}
                    disabled={submitting}
                    onPress={handleFinalSubmit}
                  />
                ) : (
                  <Button
                    title="Next Question"
                    variant="primary"
                    size="md"
                    onPress={handleNext}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerInfo: {
    flex: 1,
  },
  quizBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  topicHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  timerBox: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 3,
  },
  timerWarning: {
    borderColor: '#F59E0B',
    backgroundColor: '#78350F',
  },
  timerCritical: {
    borderColor: '#EF4444',
    backgroundColor: '#7F1D1D',
  },
  timerText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: 'monospace',
  },
  timerTextWarning: {
    color: '#FDE68A',
  },
  timerTextCritical: {
    color: '#FCA5A5',
  },
  exitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  exitBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#334155',
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#C0392B',
  },
  questionSlideContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  questionSlideContent: {
    padding: 30,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  slideTrackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  slideCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointWeight: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  promptCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    marginBottom: 20,
  },
  promptText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#C0392B',
    backgroundColor: '#2A1B24',
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#0F172A',
  },
  optionIndicatorSelected: {
    borderColor: '#C0392B',
    backgroundColor: '#C0392B',
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
  },
  optionLetterSelected: {
    color: '#FFFFFF',
  },
  optionText: {
    fontSize: 15,
    color: '#E2E8F0',
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  answeredStatus: {
    alignItems: 'center',
  },
  answeredText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    padding: 36,
    maxWidth: 580,
    width: '100%',
    alignItems: 'center',
  },
  cardPassed: {
    borderColor: '#27AE60',
  },
  cardFailed: {
    borderColor: '#F59E0B',
  },
  resultBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 22,
  },
  bannerPassed: {
    backgroundColor: '#052E16',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  bannerFailed: {
    backgroundColor: '#451A03',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  resultBannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 18,
    fontWeight: '900',
    marginRight: 12,
  },
  resultBannerCopy: {
    flex: 1,
  },
  resultBannerMessage: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 4,
  },
  resultBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  badgePassed: {
    backgroundColor: '#14532D',
  },
  badgeFailed: {
    backgroundColor: '#7F1D1D',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextPassed: {
    color: '#4ADE80',
  },
  badgeTextFailed: {
    color: '#FBBF24',
  },
  metricsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 126,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    justifyContent: 'center',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  metricSubtext: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  progressRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 7,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  scoreNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  scoreDetail: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
  },
  pointsDetail: {
    fontSize: 15,
    color: '#E2E8F0',
    marginTop: 8,
    fontWeight: '700',
  },
  benchmarkRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  benchmarkLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  benchmarkVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    width: '100%',
    marginVertical: 20,
  },
  resultOutcomeText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 24,
  },
  resultActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
});
