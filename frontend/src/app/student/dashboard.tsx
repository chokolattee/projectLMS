import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import { useAuth } from '@/context/AuthContext';
import { DashboardData } from '@/types/auth';
import { studentApi, StudentSubjectDetails } from '@/services/studentApi';
import { WaygroundStudentQuizModal } from '@/components/student/WaygroundStudentQuizModal';
import { PresentationViewer } from '@/components/presentation/PresentationViewer';

/* ------------------------------------------------------------------ */
/*  Brand tokens (same as login + welcome)                             */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#FDE680',
  yellow: '#FFE97F',
  coral: '#FF6B81',
  coralDeep: '#D94D63',
  pink: '#FFD1D4',
  pinkDeep: '#E8A9AE',
  cream: '#FFF5BA',
  red: '#D4381C',
  blue: '#00A3EB',
  blueDeep: '#0079AD',
  ink: '#4A1A24',
  muted: '#8F5F68',
  paper: '#FFFBF0',
  green: '#2FB57A',
  greenDeep: '#1E8A5B',
};
const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

const ACCENTS = [
  { face: C.blue, deep: C.blueDeep, fg: '#FFFFFF' },
  { face: C.coral, deep: C.coralDeep, fg: C.cream },
  { face: C.cream, deep: '#E8D77A', fg: C.ink },
  { face: C.pink, deep: C.pinkDeep, fg: C.ink },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ------------------------------------------------------------------ */
/*  Small shared pieces                                                */
/* ------------------------------------------------------------------ */
function useBubble() {
  const anim = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (msg: string, ms = 2600) => {
    if (timer.current) clearTimeout(timer.current);
    setText(msg);
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, ms);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { anim, text, say };
}

function useBob(reduce: boolean, ms = 1700) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    l.start();
    return () => l.stop();
  }, [reduce, ms, v]);
  return v;
}

function Bubble({
  text,
  anim,
  style,
  center,
}: {
  text: string;
  anim: Animated.Value;
  style?: any;
  center?: boolean;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.bubble,
        style,
        { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
      ]}
    >
      <Text style={s.bubbleText}>{text}</Text>
      <View style={[s.bubbleTail, center && { left: '50%', marginLeft: -6 }]} />
    </Animated.View>
  );
}

/** Confetti pop. Bump `trigger` to fire it. */
function Burst({ trigger, disabled }: { trigger: number; disabled?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger || disabled) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [trigger, disabled, v]);
  if (disabled) return null;
  const colors = [C.coral, C.blue, C.cream, C.pink, C.green, C.red];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '45%', width: 0, height: 0, zIndex: 20 }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const d = 80 + (i % 3) * 26;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 11,
              height: 11,
              borderRadius: i % 2 ? 6 : 3,
              borderWidth: 2,
              borderColor: C.ink,
              backgroundColor: colors[i % colors.length],
              opacity: v.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * d] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * d + 30] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 220}deg`] }) },
                { scale: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1.2, 0.8] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** Key-style button that sinks when pressed. */
function Chunky({
  children,
  onPress,
  face,
  shadow,
  radius = 16,
  depth = 5,
  style,
  faceStyle,
  disabled,
  held,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  face: string;
  shadow: string;
  radius?: number;
  depth?: number;
  style?: any;
  faceStyle?: any;
  disabled?: boolean;
  held?: boolean;
}) {
  const p = useRef(new Animated.Value(held ? 1 : 0)).current;
  const heldRef = useRef(!!held);
  useEffect(() => {
    heldRef.current = !!held;
    Animated.spring(p, { toValue: held ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [held, p]);
  const rest = () =>
    Animated.spring(p, { toValue: heldRef.current ? 1 : 0, friction: 5, useNativeDriver: true }).start();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.timing(p, { toValue: 1, duration: 70, useNativeDriver: true }).start()}
      onPressOut={rest}
      style={[{ paddingBottom: depth, opacity: disabled ? 0.55 : 1 }, style]}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: depth,
          bottom: 0,
          borderRadius: radius,
          backgroundColor: shadow,
          borderWidth: 2.5,
          borderColor: C.ink,
        }}
      />
      <Animated.View
        style={[
          {
            backgroundColor: face,
            borderRadius: radius,
            borderWidth: 2.5,
            borderColor: C.ink,
            transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }) }],
          },
          faceStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function Btn({
  label,
  onPress,
  tone = 'coral',
  loading,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'coral' | 'blue' | 'paper' | 'green';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = {
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    blue: { face: C.blue, shadow: C.blueDeep, text: '#FFFFFF' },
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
    green: { face: C.green, shadow: C.greenDeep, text: '#FFFFFF' },
  }[tone];
  return (
    <Chunky face={t.face} shadow={t.shadow} onPress={onPress} disabled={disabled || loading} faceStyle={s.btnFace}>
      {loading ? (
        <ActivityIndicator color={t.text} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={t.text} /> : null}
          <Text style={[s.btnText, { color: t.text }]}>{label}</Text>
        </View>
      )}
    </Chunky>
  );
}

/** Number that rolls up from 0 when it mounts. */
function CountUp({ to, decimals = 0, style }: { to: number; decimals?: number; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState((0).toFixed(decimals));
  useEffect(() => {
    const id = v.addListener(({ value }) => setShown(value.toFixed(decimals)));
    Animated.timing(v, { toValue: to, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [to, decimals, v]);
  return <Text style={style}>{shown}</Text>;
}

/* ------------------------------------------------------------------ */
/*  Reading progress: sticks above the document while scrolling        */
/* ------------------------------------------------------------------ */
function ReadBar({ anim, pct, label }: { anim: Animated.Value; pct: number; label: string }) {
  const done = pct >= 100;
  const w = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={s.readWrap}>
      <View style={s.readBar}>
        <View style={[s.readIcon, done && { backgroundColor: C.green }]}>
          <Ionicons name={done ? 'checkmark' : 'book'} size={14} color={done ? '#FFFFFF' : C.ink} />
        </View>
        <View style={s.readLabelBox}>
          <Text style={s.readLabel} numberOfLines={1}>
            {done ? 'Reached the end' : label}
          </Text>
        </View>
        <View style={s.readTrackWrap}>
          <View style={s.readTrack}>
            <Animated.View style={[s.readFill, { width: w }, done && { backgroundColor: C.green }]} />
          </View>
          <Animated.View pointerEvents="none" style={[s.readMarker, { left: w }]}>
            <Image source={require('@/assets/images/mascot.png')} style={{ width: 34, height: 30 }} resizeMode="contain" />
          </Animated.View>
        </View>
        <Text style={s.readPct}>{pct}%</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat sticker: pops in once, then squishes + talks when tapped      */
/* ------------------------------------------------------------------ */
function StatSticker({
  label,
  icon,
  accent,
  rot,
  radius = 20,
  delay = 0,
  children,
  onTap,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: typeof ACCENTS[number];
  rot: number;
  radius?: number;
  delay?: number;
  children: React.ReactNode;
  onTap: () => void;
}) {
  const sq = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [delay, enter]);
  const tap = () => {
    sq.setValue(0);
    Animated.sequence([
      Animated.timing(sq, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(sq, { toValue: 0, friction: 3, tension: 130, useNativeDriver: true }),
    ]).start();
    onTap();
  };
  return (
    <Animated.View
      style={{
        flexGrow: 1,
        flexBasis: 150,
        opacity: enter,
        transform: [
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
          { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: [`${rot * 6}deg`, `${rot}deg`] }) },
        ],
      }}
    >
      <Animated.View
        style={{
          transform: [
            { scaleX: sq.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            { scaleY: sq.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
          ],
        }}
      >
        <Chunky face={accent.face} shadow={accent.deep} radius={radius} depth={6} onPress={tap} faceStyle={{ padding: 16 }}>
          <View style={s.statIcon}>
            <Ionicons name={icon} size={16} color={C.ink} />
          </View>
          {children}
          <Text style={[s.statLabel, { color: accent.fg }]}>{label}</Text>
        </Chunky>
      </Animated.View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Course folder: tab, peeking sheet, colored body, label sticker     */
/* ------------------------------------------------------------------ */
function FolderCard({
  code,
  title,
  instructor,
  schedule,
  accent,
  tilt,
  width,
  featured,
  onPress,
}: {
  code: string;
  title: string;
  instructor?: string;
  schedule?: string;
  accent: typeof ACCENTS[number];
  tilt: number;
  width: any;
  featured?: boolean;
  onPress: () => void;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const sheetTo = (v: number) =>
    Animated.spring(lift, { toValue: v, friction: 6, tension: 120, useNativeDriver: true }).start();
  const DEPTH = 7;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: true }).start();
        sheetTo(1);
      }}
      onPressOut={() => {
        Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start();
        sheetTo(0);
      }}
      {...({ onHoverIn: () => sheetTo(1), onHoverOut: () => sheetTo(0) } as any)}
      style={{ width, paddingBottom: DEPTH, transform: [{ rotate: `${tilt}deg` }] }}
    >
      <View style={[s.folderShadow, { backgroundColor: accent.deep, bottom: 0, top: 36 + DEPTH }]} />
      <Animated.View style={{ transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, DEPTH] }) }] }}>
        <Animated.View
          pointerEvents="none"
          style={[
            s.folderSheet,
            { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }] },
          ]}
        >
          <View style={s.sheetLine} />
          <View style={[s.sheetLine, { width: '60%' }]} />
        </Animated.View>

        <View style={[s.folderTab, { backgroundColor: accent.face }]}>
          <Ionicons name="folder-open" size={15} color={accent.fg} />
          <Text style={[s.folderTabText, { color: accent.fg }]} numberOfLines={1}>
            {code}
          </Text>
        </View>

        {featured && (
          <View style={s.featBadge}>
            <Ionicons name="star" size={13} color={C.ink} />
            <Text style={s.featBadgeText}>Up first</Text>
          </View>
        )}

        <View style={[s.folderBody, { backgroundColor: accent.face }]}>
          <View style={s.folderLabel}>
            <View style={{ flex: 1 }}>
              <Text style={[s.courseTitle, featured && { fontSize: 22, lineHeight: 28 }]} numberOfLines={2}>
                {title}
              </Text>
              <View style={{ gap: 5, marginTop: 8 }}>
                {instructor ? (
                  <View style={s.infoLine}>
                    <Ionicons name="person-outline" size={14} color={C.muted} />
                    <Text style={s.courseMeta} numberOfLines={1}>
                      {instructor}
                    </Text>
                  </View>
                ) : null}
                <View style={s.infoLine}>
                  <Ionicons name="time-outline" size={14} color={C.muted} />
                  <Text style={s.courseMeta} numberOfLines={1}>
                    {schedule || 'Schedule to be announced'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={s.courseGo}>
              <Ionicons name="arrow-forward" size={20} color={C.ink} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function DashboardScreen() {
  const { fetchDashboard, user, token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  // Role gate
  useEffect(() => {
    if (authLoading) return;
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
  }, [authLoading, user]);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Course viewer state
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [subjectDetails, setSubjectDetails] = useState<StudentSubjectDetails | null>(null);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'text' | 'presentation' | 'summary'>('text');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [burst, setBurst] = useState(0);

  // Mascot
  const bob = useBob(reduce);
  const jump = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { anim: bubbleAnim, text: bubbleText, say } = useBubble();
  const pokeIdx = useRef(0);

  const hop = () =>
    Animated.sequence([
      Animated.timing(jump, { toValue: -26, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 3, tension: 110, useNativeDriver: true }),
    ]).start();

  // Reading progress (how far through the document the learner has scrolled)
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const readAnim = useRef(new Animated.Value(0)).current;
  const [readPct, setReadPct] = useState(0);
  const viewport = useRef({ y: 0, h: 0 });
  const docBox = useRef({ y: 0, h: 0 });
  const userScrolled = useRef(false);
  const reachedEnd = useRef(false);

  const recalcRead = () => {
    const { y: off, h: vh } = viewport.current;
    const { y: dy, h: dh } = docBox.current;
    if (!dh || !vh) return;
    const p = Math.max(0, Math.min(100, ((off + vh - dy) / dh) * 100));
    readAnim.setValue(p);
    const r = Math.round(p);
    setReadPct((prev) => (prev === r ? prev : r));
  };

  const onMainScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    viewport.current = { y: contentOffset.y, h: layoutMeasurement.height };
    if (contentOffset.y > 20) userScrolled.current = true;
    recalcRead();
  };

  useEffect(() => {
    if (!authLoading) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    const result = await fetchDashboard();
    if (result.success && result.data) setData(result.data);
    else setError(result.message || 'Failed to load your courses');
    setLoading(false);
  };

  // Animate the trail marker + greet once data arrives
  const academics = data?.academics;
  const profile = data?.profile;
  const pct = academics?.totalSubjects
    ? Math.min(Math.round(((academics.completedSubjects ?? 0) / academics.totalSubjects) * 100), 100)
    : 0;

  useEffect(() => {
    if (!data) return;
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 1100,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const t = setTimeout(() => say(`${greeting()}! Ready to study?`), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
        if (firstTopic) setActiveTopicId(firstTopic.id);
      }
      setWorkspaceTab('text');
    } else {
      Alert.alert('Course unavailable', res.message || 'Could not load this course.');
      setActiveSubjectId(null);
    }
  };

  const reloadSubjectDetails = async () => {
    if (!activeSubjectId) return;
    const res = await studentApi.getSubjectDetails(token, activeSubjectId);
    if (res.success && res.data) setSubjectDetails(res.data);
  };

  const activeModule =
    subjectDetails?.modules.find((m) => m.id === activeModuleId) || subjectDetails?.modules[0] || null;
  const activeTopic =
    activeModule?.topics.find((t) => t.id === activeTopicId) || activeModule?.topics[0] || null;

  // Reset reading progress whenever the learner switches topic or tab
  useEffect(() => {
    viewport.current = { ...viewport.current, y: 0 };
    userScrolled.current = false;
    reachedEnd.current = false;
    readAnim.setValue(0);
    setReadPct(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    const t = setTimeout(recalcRead, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic?.id, workspaceTab]);

  // Small celebration the first time they reach the end of a document
  useEffect(() => {
    if (readPct >= 100 && userScrolled.current && !reachedEnd.current && activeTopic) {
      reachedEnd.current = true;
      hop();
      say('You made it to the end!', 2400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readPct]);

  const handleProceedToNextTopic = async () => {
    if (!subjectDetails || !activeTopic) {
      setShowQuizModal(false);
      return;
    }
    const topics = subjectDetails.modules.flatMap((m) => m.topics);
    const i = topics.findIndex((t) => t.id === activeTopic.id);
    const next = i >= 0 ? topics[i + 1] : undefined;
    setShowQuizModal(false);
    if (next) {
      const nextMod = subjectDetails.modules.find((m) => m.topics.some((t) => t.id === next.id));
      if (nextMod) {
        setActiveModuleId(nextMod.id);
        setActiveTopicId(next.id);
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
      hop();
      setBurst((b) => b + 1);
      say('Quiz unlocked. You got this!', 3000);
    } else {
      Alert.alert('Error', res.message || 'Could not update review status.');
    }
    setMarkingReviewed(false);
  };

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    if (!activeSubjectId || !activeTopic) return { success: false };
    const res = await studentApi.submitQuiz(token, activeSubjectId, activeTopic.id, answers);
    if (res.success) {
      await reloadSubjectDetails();
      hop();
      setBurst((b) => b + 1);
    }
    return res;
  };

  const pokeGate = () => {
    hop();
    const lines = ['Boop!', 'Almost there.', 'Take your time.', 'Tiny steps count.'];
    say(lines[pokeIdx.current++ % lines.length], 2000);
  };

  /* ---------------- loading / error ---------------- */
  if (!fontsLoaded) return null;

  if (authLoading || loading) {
    return (
      <View style={s.centered}>
        <Image source={require('@/assets/images/mascot_gif.gif')} style={{ width: 180, height: 180 }} resizeMode="contain" />
        <Text style={s.centeredTitle}>Packing your books…</Text>
        <Text style={s.centeredSub}>Getting your courses ready</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Image source={require('@/assets/images/mascot.png')} style={{ width: 170, height: 150 }} resizeMode="contain" />
        <Text style={s.centeredTitle}>Couldn’t load your courses</Text>
        <Text style={[s.centeredSub, { marginBottom: 20 }]}>{error}</Text>
        <Btn label="Try again" icon="refresh" onPress={loadDashboard} />
      </View>
    );
  }

  /* ================================================================ */
  /*  COURSE VIEWER                                                    */
  /* ================================================================ */
  if (activeSubjectId && subjectDetails) {
    const hasQuiz = activeTopic?.quiz && (activeTopic.quiz.questions?.length || 0) > 0;
    const overall = subjectDetails.overallProgressPercent || 0;
    const tabs: { key: typeof workspaceTab; label: string; icon: keyof typeof Ionicons.glyphMap; reading: string }[] = [
      { key: 'text', label: 'Read', icon: 'book-outline', reading: 'Reading' },
      { key: 'presentation', label: 'Slides', icon: 'easel-outline', reading: 'Viewing slides' },
      { key: 'summary', label: 'Recap', icon: 'sparkles-outline', reading: 'Reading recap' },
    ];
    const readingLabel = tabs.find((t) => t.key === workspaceTab)?.reading || 'Reading';
    const masteryLine = activeTopic?.quizPassed
      ? 'Passed! The next lesson is open.'
      : activeTopic?.contentReviewed
      ? `Review done. Score ${activeTopic.quiz?.passingScorePercent || 75}% or higher on the quiz to move on.`
      : 'Read the text and slides, then tap “I’ve reviewed this” to unlock the quiz.';

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Top bar */}
        <View style={[s.topBar, !isDesktop && { flexWrap: 'wrap', gap: 10 }]}>
          <View style={s.topLeft}>
            <Chunky
              face={C.paper}
              shadow={C.pinkDeep}
              radius={12}
              depth={4}
              onPress={() => {
                setActiveSubjectId(null);
                setSubjectDetails(null);
              }}
              faceStyle={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="chevron-back" size={16} color={C.ink} />
              <Text style={s.smallBtnText}>Courses</Text>
            </Chunky>
            {!isDesktop && (
              <Chunky
                face={mobileCurriculumOpen ? C.coral : C.cream}
                shadow={mobileCurriculumOpen ? C.coralDeep : '#E8D77A'}
                radius={12}
                depth={4}
                onPress={() => setMobileCurriculumOpen((p) => !p)}
                faceStyle={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name={mobileCurriculumOpen ? 'close' : 'list'} size={16} color={C.ink} />
                <Text style={s.smallBtnText}>{mobileCurriculumOpen ? 'Close' : 'Modules'}</Text>
              </Chunky>
            )}
            <View style={s.codeChip}>
              <Text style={s.codeChipText}>
                {subjectDetails.subject?.code || (subjectDetails as any).code || 'COURSE'}
              </Text>
            </View>
            <Text style={s.topTitle} numberOfLines={1}>
              {subjectDetails.subject?.name || (subjectDetails as any).name || 'Course'}
            </Text>
          </View>

          <View style={[s.topProgress, !isDesktop && { width: '100%', marginLeft: 0 }]}>
            <View style={s.trackOuter}>
              <View style={[s.trackInner, { width: `${overall}%` }]} />
            </View>
            <Text style={s.topPct}>{overall}%</Text>
          </View>
        </View>

        <View style={[s.workspace, !isDesktop && { flexDirection: 'column' }]}>
          {/* Curriculum */}
          {(isDesktop || mobileCurriculumOpen || !activeTopic) && (
            <View style={[s.sidebar, !isDesktop && { width: '100%', maxHeight: mobileCurriculumOpen ? 360 : '100%' }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 12 }}>
                {subjectDetails.modules.map((mod, mi) => {
                  const a = ACCENTS[mi % ACCENTS.length];
                  const isOpen = !collapsed[mod.id];
                  const doneCount = mod.topics.filter(
                    (t) => t.quizPassed || (t.contentReviewed && (!t.quiz || t.quiz.questions.length === 0))
                  ).length;
                  return (
                    <View key={mod.id} style={s.modBlock}>
                      <Pressable
                        onPress={() => setCollapsed((c) => ({ ...c, [mod.id]: isOpen }))}
                        style={[s.modHead, { backgroundColor: a.face }]}
                      >
                        <View style={s.modNum}>
                          <Text style={s.modNumText}>{mi + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.modTitle, { color: a.fg }]} numberOfLines={2}>
                            {mod.title}
                          </Text>
                          <Text style={[s.modCount, { color: a.fg }]}>
                            {doneCount} of {mod.topics.length} done
                          </Text>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={a.fg} />
                      </Pressable>

                      {isOpen &&
                        mod.topics.map((top, ti) => {
                          const isActive = activeTopic?.id === top.id;
                          const isLocked = !top.unlocked;
                          const isDone =
                            top.quizPassed ||
                            (top.contentReviewed && (!top.quiz || top.quiz.questions.length === 0));
                          const first = ti === 0;
                          const last = ti === mod.topics.length - 1;
                          return (
                            <Pressable
                              key={top.id}
                              disabled={isLocked}
                              onPress={() => {
                                setActiveModuleId(mod.id);
                                setActiveTopicId(top.id);
                                setWorkspaceTab('text');
                                if (!isDesktop) setMobileCurriculumOpen(false);
                              }}
                              style={[
                                s.topicRow,
                                isActive && s.topicRowActive,
                                isLocked && { opacity: 0.55 },
                              ]}
                            >
                              <View
                                pointerEvents="none"
                                style={[
                                  s.topicLine,
                                  first && { top: '50%' },
                                  last && { bottom: '50%' },
                                  first && last && { opacity: 0 },
                                ]}
                              />
                              <View
                                style={[
                                  s.topicBadge,
                                  isDone && { backgroundColor: C.green },
                                  isLocked && { backgroundColor: C.pink },
                                  isActive && !isDone && !isLocked && { backgroundColor: C.coral },
                                ]}
                              >
                                <Ionicons
                                  name={isDone ? 'checkmark' : isLocked ? 'lock-closed' : 'play'}
                                  size={12}
                                  color={isDone || (isActive && !isLocked) ? '#FFFFFF' : C.ink}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[s.topicTitle, isActive && { fontFamily: F.bold }]} numberOfLines={2}>
                                  {top.title}
                                </Text>
                                <Text style={s.topicMeta}>
                                  {isDone
                                    ? top.quizPassed
                                      ? `Passed with ${top.bestScorePercent}%`
                                      : 'Completed'
                                    : isLocked
                                    ? 'Finish the previous topic first'
                                    : top.contentReviewed
                                    ? 'Quiz is ready'
                                    : 'Not started'}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Main */}
          <View style={{ flex: 1 }}>
            {activeTopic ? (
              <>
                <ReadBar anim={readAnim} pct={readPct} label={readingLabel} />

                <ScrollView
                  ref={scrollRef}
                  contentContainerStyle={s.mainBody}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={onMainScroll}
                  onLayout={(e) => {
                    viewport.current = { ...viewport.current, h: e.nativeEvent.layout.height };
                    recalcRead();
                  }}
                >
                  {/* Document */}
                  <View
                    style={s.contentCard}
                    onLayout={(e) => {
                      docBox.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
                      recalcRead();
                    }}
                  >
                    {workspaceTab === 'text' &&
                      (activeTopic.content?.richText ? (
                        <Text style={s.prose}>{activeTopic.content.richText.replace(/<[^>]+>/g, '')}</Text>
                      ) : (
                        <Empty icon="document-text-outline" text="No reading for this topic yet." />
                      ))}

                    {workspaceTab === 'presentation' &&
                      (activeTopic.content?.presentationUrl ? (
                        <PresentationViewer
                          url={activeTopic.content.presentationUrl}
                          fileName={activeTopic.content.presentationFileName || `${activeTopic.title}.pptx`}
                          fileSize={activeTopic.content.presentationFileSize}
                          s3Key={activeTopic.content.presentationS3Key}
                          minHeight={680}
                        />
                      ) : (
                        <Empty icon="easel-outline" text="No slide deck attached to this topic." />
                      ))}

                    {workspaceTab === 'summary' && (
                      <>
                        {activeTopic.content?.summaryText ? (
                          <View style={{ marginBottom: 18 }}>
                            <Text style={s.blockTitle}>The short version</Text>
                            <Text style={s.prose}>{activeTopic.content.summaryText}</Text>
                          </View>
                        ) : null}
                        {activeTopic.content?.summaryBullets?.length ? (
                          <View>
                            <Text style={s.blockTitle}>Remember these</Text>
                            {activeTopic.content.summaryBullets.map((b, i) => (
                              <View key={i} style={[s.bulletRow, { transform: [{ rotate: i % 2 ? '0.4deg' : '-0.4deg' }] }]}>
                                <View style={[s.bulletBadge, { backgroundColor: ACCENTS[i % ACCENTS.length].face }]}>
                                  <Text style={s.bulletNum}>{i + 1}</Text>
                                </View>
                                <Text style={s.bulletText}>{b}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        {!activeTopic.content?.summaryText && !activeTopic.content?.summaryBullets?.length && (
                          <Empty icon="sparkles-outline" text="No recap for this topic yet." />
                        )}
                      </>
                    )}
                  </View>

                  {/* Where am I + switch view (now sits under the document) */}
                  <View style={s.dock}>
                    <View style={s.dockInfo}>
                      <View style={s.dockPin}>
                        <Ionicons name="bookmark" size={16} color={C.ink} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.crumb} numberOfLines={1}>
                          {activeModule?.title}
                        </Text>
                        <Text style={s.dockTitle} numberOfLines={2}>
                          {activeTopic.title}
                        </Text>
                      </View>
                    </View>
                    <View style={s.tabRow}>
                      {tabs.map((t) => (
                        <Chunky
                          key={t.key}
                          held={workspaceTab === t.key}
                          face={workspaceTab === t.key ? C.blue : C.paper}
                          shadow={workspaceTab === t.key ? C.blueDeep : C.pinkDeep}
                          radius={14}
                          depth={5}
                          onPress={() => setWorkspaceTab(t.key)}
                          faceStyle={{ paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <Ionicons name={t.icon} size={16} color={workspaceTab === t.key ? '#FFFFFF' : C.ink} />
                          <Text style={[s.tabText, workspaceTab === t.key && { color: '#FFFFFF' }]}>{t.label}</Text>
                        </Chunky>
                      ))}
                    </View>
                  </View>

                  {/* Mastery gate: short, centered */}
                  <View style={s.gate}>
                    <Burst trigger={burst} disabled={reduce} />
                    <Bubble
                      center
                      text={bubbleText}
                      anim={bubbleAnim}
                      style={{ position: 'absolute', top: -30, alignSelf: 'center', zIndex: 5 }}
                    />
                    <Pressable onPress={pokeGate} accessibilityLabel="Mascot">
                      <Animated.View style={{ transform: [{ translateY: jump }] }}>
                        <Image source={require('@/assets/images/mascot.png')} style={s.gateMascot} resizeMode="contain" />
                      </Animated.View>
                    </Pressable>
                    <Text style={s.gateTitle}>
                      {activeTopic.quizPassed ? 'Topic cleared' : activeTopic.contentReviewed ? 'Quiz unlocked' : 'Quiz locked'}
                    </Text>
                    <Text style={s.gateDesc}>{masteryLine}</Text>
                    <View style={s.gateBtns}>
                      {!activeTopic.contentReviewed && (
                        <Btn
                          label="I’ve reviewed this"
                          tone="paper"
                          icon="checkmark-done"
                          loading={markingReviewed}
                          onPress={handleMarkReviewed}
                        />
                      )}
                      {hasQuiz && activeTopic.contentReviewed && (
                        <Btn
                          label={activeTopic.quizPassed ? 'Quiz passed' : 'Take the quiz'}
                          tone={activeTopic.quizPassed ? 'green' : 'blue'}
                          icon={activeTopic.quizPassed ? 'trophy' : 'flash'}
                          disabled={activeTopic.quizPassed}
                          onPress={() => setShowQuizModal(true)}
                        />
                      )}
                    </View>
                  </View>
                </ScrollView>
              </>
            ) : (
              <View style={s.centered}>
                <Text style={s.centeredTitle}>Pick a topic</Text>
                <Text style={s.centeredSub}>Choose an unlocked topic from the list to start.</Text>
              </View>
            )}
          </View>
        </View>

        {activeTopic?.quiz && (
          <WaygroundStudentQuizModal
            visible={showQuizModal}
            quiz={activeTopic.quiz}
            topicTitle={activeTopic.title}
            onClose={() => setShowQuizModal(false)}
            onSubmit={handleQuizSubmit}
            onReviewContent={() => setWorkspaceTab('text')}
            onProceedToNextTopic={handleProceedToNextTopic}
          />
        )}
      </SafeAreaView>
    );
  }

  /* ================================================================ */
  /*  DASHBOARD HOME                                                   */
  /* ================================================================ */
  const subjects = (academics?.enrolledSubjects ?? []).filter(Boolean);
  const initials = (profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '');
  const pokeLines = ['Boop!', 'Tap a course to dive in.', 'Snacks first, then study.', 'I believe in you.'];
  const pokeMascot = () => {
    hop();
    say(pokeLines[pokeIdx.current++ % pokeLines.length]);
  };

  const meta = [
    { icon: 'id-card-outline' as const, label: 'Student ID', text: profile?.studentId, c: C.cream },
    { icon: 'school-outline' as const, label: 'Year level', text: user?.yearLevel, c: C.pink },
    { icon: 'calendar-outline' as const, label: 'Semester', text: academics?.semester, c: C.cream },
    { icon: 'time-outline' as const, label: 'School year', text: academics?.academicYear ? `SY ${academics.academicYear}` : null, c: C.pink },
  ].filter((m) => m.text);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View pointerEvents="none" style={s.blobCoral} />
        <View pointerEvents="none" style={s.blobBlue} />

        <View style={s.container}>
          {/* ROW 1: hello card (left) + progress trail (right) */}
          <View style={[s.heroRow, isDesktop && { flexDirection: 'row' }]}>
            <View style={[{ flexGrow: 1 }, isDesktop && { flex: 1.6 }]}>
              <Pressable onPress={pokeMascot} style={s.mascotWrap} accessibilityLabel="Mascot">
                <Animated.Image
                  source={require('@/assets/images/mascot.png')}
                  resizeMode="contain"
                  style={{
                    width: 170,
                    height: 150,
                    transform: [
                      { translateY: Animated.add(jump, bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] })) },
                      { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
                    ],
                  }}
                />
              </Pressable>
              <Bubble text={bubbleText} anim={bubbleAnim} style={{ position: 'absolute', top: -60, right: 170, zIndex: 5 }} />

              <View style={[s.helloWrap, { flexGrow: 1 }]}>
                <View style={s.helloShadow} />
                <View style={[s.hello, { flexGrow: 1, justifyContent: 'space-between', gap: 26 }]}>
                  <View style={s.helloTop}>
                    <View style={s.avatarBig}>
                      <Text style={s.avatarBigText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.helloSmall}>{greeting()},</Text>
                      <Text style={[s.helloName, isDesktop && { fontSize: 44, lineHeight: 48 }]} numberOfLines={2}>
                        {profile?.firstName} {profile?.lastName}
                      </Text>
                    </View>
                  </View>

                  <View style={s.infoGrid}>
                    {meta.map((m, i) => (
                      <View
                        key={m.label}
                        style={[s.infoTile, { backgroundColor: m.c, transform: [{ rotate: i % 2 ? '1.2deg' : '-1.2deg' }] }]}
                      >
                        <View style={s.infoIcon}>
                          <Ionicons name={m.icon} size={15} color={C.ink} />
                        </View>
                        <Text style={s.infoLabel}>{m.label}</Text>
                        <Text style={s.infoValue} numberOfLines={1}>
                          {m.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={[s.window, isDesktop && { flex: 1 }]}>
              <View style={s.windowBar}>
                <View style={s.dot} />
                <View style={s.dot} />
                <View style={s.dot} />
                <Text style={s.windowTitle}>Progress trail</Text>
              </View>
              <View style={{ padding: 20, flexGrow: 1 }}>
                <Text style={s.trailBig}>
                  {academics?.completedSubjects ?? 0}
                  <Text style={s.trailBigSub}> of {academics?.totalSubjects ?? 0} subjects done</Text>
                </Text>

                <View style={s.trailTrackWrap}>
                  <View style={s.trailTrack}>
                    <Animated.View
                      style={[s.trailFill, { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
                    />
                  </View>
                  <Animated.View
                    pointerEvents="none"
                    style={[s.trailMarker, { left: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
                  >
                    <Image source={require('@/assets/images/mascot.png')} style={{ width: 52, height: 46 }} resizeMode="contain" />
                  </Animated.View>
                </View>

                <View style={s.trailEnds}>
                  <Text style={s.trailEndText}>Start</Text>
                  <Text style={s.trailEndText}>{pct}%</Text>
                  <Text style={s.trailEndText}>Finish</Text>
                </View>

                <View style={s.notice}>
                  <Ionicons name="bulb-outline" size={20} color={C.ink} />
                  <Text style={s.noticeText}>
                    {pct === 100
                      ? 'Every subject is done. Time to celebrate.'
                      : subjects.length
                      ? 'Open a course and clear one topic today.'
                      : 'Your progress will build up here.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ROW 2: four stat stickers, each a different shape */}
          <View style={s.statRow}>
            <StatSticker
              label="GPA"
              icon="ribbon"
              accent={ACCENTS[2]}
              rot={-2}
              radius={32}
              delay={0}
              onTap={() => say(academics?.gpa ? 'Look at those grades!' : 'GPA shows up after grading.')}
            >
              {academics?.gpa != null ? (
                <CountUp to={academics.gpa} decimals={2} style={[s.statValue, { color: C.ink }]} />
              ) : (
                <Text style={[s.statValue, { color: C.ink }]}>—</Text>
              )}
            </StatSticker>
            <StatSticker
              label="Enrolled"
              icon="library"
              accent={ACCENTS[0]}
              rot={1.5}
              radius={10}
              delay={90}
              onTap={() => say(`${academics?.totalSubjects ?? 0} subjects this term.`)}
            >
              <CountUp to={academics?.totalSubjects ?? 0} style={[s.statValue, { color: '#FFFFFF' }]} />
            </StatSticker>
            <StatSticker
              label="Completed"
              icon="checkmark-done"
              accent={ACCENTS[3]}
              rot={-1.5}
              radius={26}
              delay={180}
              onTap={() => say(pct === 100 ? 'All done. Wow!' : `${pct}% of the way there.`)}
            >
              <CountUp to={academics?.completedSubjects ?? 0} style={[s.statValue, { color: C.ink }]} />
            </StatSticker>
            <StatSticker
              label="Standing"
              icon="shield-checkmark"
              accent={ACCENTS[1]}
              rot={2}
              radius={14}
              delay={270}
              onTap={() => say('Keep it up!')}
            >
              <Text style={[s.statValue, { color: C.cream, fontSize: 22, lineHeight: 30 }]} numberOfLines={1}>
                {academics?.standing || '—'}
              </Text>
            </StatSticker>
          </View>

          {/* ROW 3: courses (first one is the big one) */}
          <View style={s.sectionHead}>
            <Text style={s.h2}>Your courses</Text>
            <View style={s.countPill}>
              <Text style={s.countPillText}>{subjects.length}</Text>
            </View>
          </View>

          {loadingSubject && (
            <View style={s.loadingRow}>
              <ActivityIndicator color={C.coral} />
              <Text style={s.loadingRowText}>Opening your course…</Text>
            </View>
          )}

          {subjects.length > 0 ? (
            <View style={s.grid}>
              {subjects.map((subject, i) => (
                <FolderCard
                  key={subject.code || subject.id || `subject-${i}`}
                  code={subject.code}
                  title={subject.title}
                  instructor={subject.instructor}
                  schedule={subject.schedule}
                  accent={ACCENTS[i % ACCENTS.length]}
                  tilt={i % 2 ? 0.4 : -0.4}
                  featured={i === 0 && subjects.length > 1}
                  width={isDesktop && i !== 0 ? '48.5%' : '100%'}
                  onPress={() => handleOpenCourse(subject.id || subject.code)}
                />
              ))}
            </View>
          ) : (
            <View style={s.emptyBox}>
              <Image source={require('@/assets/images/mascot.png')} style={{ width: 120, height: 100 }} resizeMode="contain" />
              <Text style={s.emptyTitle}>No courses yet</Text>
              <Text style={s.emptyText}>Ask your program chair to enroll you and your subjects will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 30 }}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={26} color={C.ink} />
      </View>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 60 },
  container: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 32 },
  centeredTitle: { fontFamily: F.display, fontSize: 26, color: C.ink, textAlign: 'center' },
  centeredSub: { fontFamily: F.medium, fontSize: 15, color: C.muted, marginTop: 6, textAlign: 'center' },

  blobCoral: { position: 'absolute', width: 300, height: 300, borderRadius: 999, top: -120, right: -110, backgroundColor: C.coral },
  blobBlue: { position: 'absolute', width: 200, height: 200, borderRadius: 999, top: 420, left: -110, backgroundColor: C.blue, opacity: 0.9 },

  // bubble
  bubble: {
    maxWidth: 240,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: 20,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: C.ink,
    transform: [{ rotate: '45deg' }],
  },

  // buttons
  btnFace: { paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.display, fontSize: 16, letterSpacing: 0.3 },
  smallBtnText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  // hello card
  heroRow: { marginTop: 84, gap: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mascotWrap: { position: 'absolute', top: -92, right: 26, zIndex: 1 },
  helloWrap: { zIndex: 2 },
  helloShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 28, backgroundColor: C.coral },
  hello: { backgroundColor: C.paper, borderRadius: 28, borderWidth: 3, borderColor: C.ink, padding: 22 },
  helloTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  helloSmall: { fontFamily: F.medium, fontSize: 15, color: C.muted },
  helloName: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.ink },

  avatarBig: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.coral, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarBigText: { fontFamily: F.display, fontSize: 40, color: C.cream },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoTile: { flexGrow: 1, flexBasis: 120, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, padding: 12 },
  infoIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  infoLabel: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  infoValue: { fontFamily: F.bold, fontSize: 16, color: C.ink, marginTop: 1 },

  // folders
  folderShadow: { position: 'absolute', left: 0, right: 0, borderRadius: 20, borderWidth: 2.5, borderColor: C.ink },
  folderTab: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 120, maxWidth: '70%', height: 38, paddingHorizontal: 14, borderWidth: 2.5, borderBottomWidth: 0, borderColor: C.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginBottom: -2.5, zIndex: 3 },
  folderTabText: { fontFamily: F.display, fontSize: 14, flexShrink: 1 },
  folderBody: { borderWidth: 2.5, borderColor: C.ink, borderTopLeftRadius: 0, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, padding: 14, zIndex: 2 },
  folderSheet: { position: 'absolute', top: 6, left: 140, right: 22, height: 40, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingHorizontal: 12, paddingTop: 7, gap: 4, zIndex: 1 },
  sheetLine: { height: 3, width: '85%', borderRadius: 2, backgroundColor: C.pink },
  folderLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, padding: 14 },
  featBadge: { position: 'absolute', top: -2, right: 24, zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: '5deg' }] },
  featBadgeText: { fontFamily: F.bold, fontSize: 12, color: C.ink },

  // stats
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 36, marginBottom: 40 },
  statIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontFamily: F.display, fontSize: 36, lineHeight: 40 },
  statLabel: { fontFamily: F.bold, fontSize: 14, marginTop: 2 },

  // sections
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  h2: { fontFamily: F.display, fontSize: 28, lineHeight: 32, color: C.ink },
  countPill: { backgroundColor: C.blue, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, minWidth: 34, height: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  countPillText: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  loadingRowText: { fontFamily: F.medium, fontSize: 14, color: C.muted },

  // course cards
  courseTitle: { fontFamily: F.bold, fontSize: 18, lineHeight: 24, color: C.ink },
  courseMeta: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 3 },
  courseGo: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  emptyBox: { alignItems: 'center', backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 22, padding: 24 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink, marginTop: 4 },
  emptyText: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.muted, marginTop: 4, textAlign: 'center' },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },

  // trail window
  window: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 24, overflow: 'hidden' },
  windowBar: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 7, borderBottomWidth: 3, borderBottomColor: C.ink, backgroundColor: C.blue },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink },
  windowTitle: { fontFamily: F.bold, fontSize: 15, color: '#FFFFFF', marginLeft: 8 },
  trailBig: { fontFamily: F.display, fontSize: 40, color: C.ink },
  trailBigSub: { fontFamily: F.medium, fontSize: 15, color: C.muted },
  trailTrackWrap: { marginTop: 44, marginBottom: 6, marginHorizontal: 24, justifyContent: 'center' },
  trailTrack: { height: 16, borderRadius: 9, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  trailFill: { height: '100%', backgroundColor: C.coral },
  trailMarker: { position: 'absolute', top: -38, marginLeft: -26 },
  trailEnds: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 6 },
  trailEndText: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderRadius: 14, padding: 14, marginTop: 20 },
  noticeText: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },

  // course viewer
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.paper, borderBottomWidth: 3, borderBottomColor: C.ink, paddingHorizontal: 16, paddingVertical: 10 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' },
  codeChip: { backgroundColor: C.coral, borderWidth: 2, borderColor: C.ink, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  codeChipText: { fontFamily: F.bold, fontSize: 12, color: C.cream },
  topTitle: { fontFamily: F.bold, fontSize: 16, color: C.ink, flex: 1, minWidth: 120 },
  topProgress: { width: 230, marginLeft: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackOuter: { flex: 1, height: 14, borderRadius: 8, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  trackInner: { height: '100%', backgroundColor: C.blue },
  topPct: { fontFamily: F.display, fontSize: 16, color: C.ink, width: 52, textAlign: 'right' },

  workspace: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 300, backgroundColor: C.bg, borderRightWidth: 3, borderRightColor: C.ink },
  modBlock: { backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, overflow: 'hidden' },
  modHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  modNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  modNumText: { fontFamily: F.display, fontSize: 14, color: C.ink },
  modTitle: { fontFamily: F.display, fontSize: 15, lineHeight: 19 },
  modCount: { fontFamily: F.medium, fontSize: 12, marginTop: 2, opacity: 0.85 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderLeftWidth: 5, borderLeftColor: 'transparent', overflow: 'hidden' },
  topicRowActive: { backgroundColor: C.cream, borderLeftColor: C.coral },
  topicLine: { position: 'absolute', left: 29.5, top: 0, bottom: 0, width: 3, backgroundColor: C.pinkDeep },
  topicBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  topicTitle: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: C.ink },
  topicMeta: { fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 1 },

  // reading progress
  readWrap: { width: '100%', maxWidth: 1360, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 14 },
  readBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, paddingLeft: 10, paddingRight: 14, paddingTop: 20, paddingBottom: 9 },
  readIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  readLabelBox: { minWidth: 96 },
  readLabel: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  readTrackWrap: { flex: 1, justifyContent: 'center', marginHorizontal: 12 },
  readTrack: { height: 12, borderRadius: 7, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  readFill: { height: '100%', backgroundColor: C.coral },
  readMarker: { position: 'absolute', top: -27, marginLeft: -17 },
  readPct: { fontFamily: F.display, fontSize: 15, color: C.ink, width: 50, textAlign: 'right' },

  // document + dock + gate
  mainBody: { padding: 24, maxWidth: 1360, width: '100%', alignSelf: 'center', paddingBottom: 60 },
  contentCard: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: C.ink, borderRadius: 24, padding: 28, minHeight: 320, marginBottom: 20 },
  prose: { fontFamily: F.body, fontSize: 17, lineHeight: 29, color: C.ink, maxWidth: 880 },
  blockTitle: { fontFamily: F.display, fontSize: 20, color: C.ink, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, borderRadius: 16, padding: 12, marginBottom: 10 },
  bulletBadge: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  bulletNum: { fontFamily: F.display, fontSize: 14, color: C.ink },
  bulletText: { flex: 1, fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink },

  dock: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 14 },
  dockInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 },
  dockPin: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  crumb: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  dockTitle: { fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.ink, marginTop: 1 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tabText: { fontFamily: F.bold, fontSize: 14, color: C.ink },

  gate: { alignSelf: 'center', alignItems: 'center', width: '100%', maxWidth: 520, marginTop: 44, backgroundColor: C.cream, borderWidth: 3, borderColor: C.ink, borderRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16 },
  gateMascot: { width: 84, height: 74 },
  gateTitle: { fontFamily: F.display, fontSize: 20, color: C.ink, textAlign: 'center' },
  gateDesc: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 2, textAlign: 'center', maxWidth: 400 },
  gateBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 },
});