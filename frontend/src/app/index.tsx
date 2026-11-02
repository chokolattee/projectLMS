import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { palette, radius, tones, ToneKey } from '@/constants/welcomeTheme';
import { BookShelf } from '@/components/welcome/BookShelf';
import { FolderStack, FolderItem } from '@/components/welcome/FolderStack';
import { ActionCard } from '@/components/welcome/ActionCard';

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

interface ActionConfig {
  tone: ToneKey;
  label: string;
  hint: string;
  category: string;
  route: string;
}

const CHAIR_ACTIONS = {
  primary: {
    tone: 'lavender',
    label: 'Chair Dashboard',
    hint: 'Accounts & lifecycle portal',
    category: 'Admin command',
    route: '/chair/dashboard',
  },
  others: [
    {
      tone: 'golden',
      label: 'Faculty Studio',
      hint: 'Course manager & topics',
      category: 'Curriculum',
      route: '/faculty/dashboard',
    },
  ],
} as const;

const FACULTY_ACTIONS = {
  primary: {
    tone: 'lavender',
    label: 'Faculty Dashboard',
    hint: 'Course manager and studio',
    category: 'Workspace',
    route: '/faculty/dashboard',
  },
  others: [
    { tone: 'orange', label: 'Course Modules', hint: 'Organize topic hierarchy', category: 'Curriculum', route: '/faculty/dashboard' },
    { tone: 'sky', label: 'Quiz Studio', hint: 'Multiple choice builder', category: 'Assessment', route: '/faculty/dashboard' },
    { tone: 'golden', label: 'Presentations', hint: 'AWS S3 cloud distribution', category: 'Storage', route: '/faculty/dashboard' },
  ],
} as const;

const STUDENT_ACTIONS = {
  primary: {
    tone: 'lavender',
    label: 'Student Dashboard',
    hint: 'Access learning center',
    category: 'Student',
    route: '/student/dashboard',
  },
  others: [
    {
      tone: 'sky',
      label: 'Enrolled Courses',
      hint: 'View enrolled curriculum',
      category: 'Academics',
      route: '/student/dashboard',
    },
  ],
} as const;

const CAPABILITIES: FolderItem[] = [
  {
    tab: 'Curriculum',
    title: 'Modular Structure',
    body: 'Organize subjects into distinct units, lessons, and structured syllabus topics.',
    tone: 'lavender',
  },
  {
    tab: 'Assessment',
    title: 'Quiz Engine',
    body: 'Configure multiple-choice assessments with customizable passing criteria and timers.',
    tone: 'golden',
  },
  {
    tab: 'Presentation',
    title: 'Cloud Storage',
    body: 'Upload presentation files directly to secure cloud storage infrastructure.',
    tone: 'sky',
  },
  {
    tab: 'Academics',
    title: 'Role Segregation',
    body: 'Strict permission boundaries isolating faculty management from student learners.',
    tone: 'orange',
  },
];

const COURSE_TONES: ToneKey[] = ['sky', 'golden', 'lavender'];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function WelcomeScreen() {
  const { isAuthenticated, user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, isDesktop && styles.desktopContainer]}>
          {isAuthenticated && user ? <SignedInView user={user} /> : <SignedOutView />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Signed in                                                           */
/* ------------------------------------------------------------------ */

function SignedInView({ user }: { user: any }) {
  const isChair = user.role === 'program chair' || user.role === 'program_chair' || user.role === 'admin';
  const isFaculty = user.role === 'faculty';

  const actions = isChair ? CHAIR_ACTIONS : isFaculty ? FACULTY_ACTIONS : STUDENT_ACTIONS;
  const roleLabel = isChair ? 'Program chair portal' : isFaculty ? 'Faculty portal' : 'Student portal';
  const subtitle = isChair
    ? 'Manage institutional accounts, academic status cohorts, and smart enrollments.'
    : isFaculty
      ? 'Manage your subjects, modules, presentations, and assessments.'
      : 'Track your enrolled subjects, learning materials, and quizzes.';

  const go = (route: string) => router.push(route as any);

  const courses: FolderItem[] = (user.enrolledSubjects ?? []).slice(0, 3).map((subj: any, i: number) => ({
    tab: subj.code,
    title: subj.title,
    tone: COURSE_TONES[i % COURSE_TONES.length],
  }));

  return (
    <>
      {/* Greeting */}
      <View style={styles.greetRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </Text>
        </View>
        <View style={styles.greetText}>
          <Text style={styles.greetSmall}>Welcome back,</Text>
          <Text style={styles.greetName} numberOfLines={1}>
            {user.firstName} {user.lastName}
          </Text>
        </View>
      </View>

      <View style={styles.roleRow}>
        <View style={styles.roleDot} />
        <Text style={styles.roleText}>{roleLabel}</Text>
      </View>
      <Text style={styles.lead}>{subtitle}</Text>

      {/* Shortcuts */}
      <View style={styles.actions}>
        <ActionCard
          wide
          solid
          {...actions.primary}
          art={<BookShelf scale={0.55} />}
          onPress={() => go(actions.primary.route)}
        />
        <View style={styles.actionGrid}>
          {actions.others.map((a) => (
            <ActionCard key={a.label} {...a} onPress={() => go(a.route)} />
          ))}
        </View>
      </View>

      {/* Courses (not shown to faculty, as before) */}
      {!isFaculty && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Enrolled Courses</Text>
          {courses.length > 0 ? (
            <FolderStack items={courses} />
          ) : (
            <Text style={styles.empty}>No courses currently active. Contact your faculty advisor.</Text>
          )}
        </View>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Signed out                                                          */
/* ------------------------------------------------------------------ */

function SignedOutView() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const capabilities = (
    <View style={[styles.section, isDesktop && styles.desktopSection]}>
      <Text style={styles.sectionKicker}>THE PLATFORM</Text>
      <Text style={styles.sectionTitle}>Platform Capabilities</Text>
      <FolderStack items={CAPABILITIES} />
    </View>
  );

  const hero = (
    <>
      <View style={styles.mark}>
        <Text style={styles.markText}>LMS</Text>
      </View>

      <Text style={[styles.headline, isDesktop && styles.desktopHeadline]}>Structured Learning & Faculty Course Studio</Text>

      <View style={[styles.shelfPanel, isDesktop && styles.desktopShelfPanel]}>
        <BookShelf />
      </View>

      <Text style={[styles.lead, isDesktop && styles.desktopLead]}>
        Access modular curriculum structures, structured assessments, and academic resources through a centralized platform.
      </Text>

    </>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopLanding}>
        <View style={styles.heroTopline}>
          <Text style={styles.heroKicker}>A PRACTICAL LEARNING WORKSPACE</Text>
          <Text style={styles.heroIndex}>01 / 02</Text>
        </View>
        <View style={styles.desktopHeroRow}>
          <View style={styles.desktopHero}>{hero}</View>
          <AccountCard />
        </View>
        <View style={styles.promiseRow}>
          <View style={styles.promise}>
            <Text style={styles.promiseNumber}>01</Text>
            <Text style={styles.promiseText}>Learn</Text>
          </View>
          <View style={styles.promise}>
            <Text style={styles.promiseNumber}>02</Text>
            <Text style={styles.promiseText}>Organize</Text>
          </View>
          <View style={styles.promise}>
            <Text style={styles.promiseNumber}>03</Text>
            <Text style={styles.promiseText}>Assessment</Text>
          </View>
        </View>
        {capabilities}
      </View>
    );
  }

  return (
    <>
      {hero}
      <AccountCard />
      {capabilities}
    </>
  );
}

function AccountCard() {
  return (
    <View style={styles.accountCard}>
      <Text style={styles.accountTitle}>Your learning space starts here.</Text>
      <Text style={styles.accountHint}>
        Sign in with your school account, or create a new profile in less than a minute.
      </Text>
      <View style={styles.ctas}>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [styles.ctaPrimary, pressed && styles.pressed]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.ctaPrimaryText}>Sign In to Access Portal</Text>
        </Pressable>
        <Pressable
          style={({ pressed }: { pressed: boolean }) => [styles.ctaSecondary, pressed && styles.pressed]}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.ctaSecondaryText}>Create an Account</Text>
        </Pressable>
      </View>
      <View style={styles.accountFooter}>
        <Text style={styles.accountFooterText}>Faculty</Text>
        <View style={styles.footerDivider} />
        <Text style={styles.accountFooterText}>Students</Text>
        <View style={styles.footerDivider} /> 
        <Text style={styles.accountFooterText}>Program chairs</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.page },
  scrollContent: { flexGrow: 1 },
  container: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 48,
  },
  desktopContainer: {
    maxWidth: 'none',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  desktopLanding: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    gap: 34,
    paddingHorizontal: 48,
    paddingTop: 42,
    paddingBottom: 52,
  },
  desktopHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 64,
  },
  desktopHero: {
    flex: 1.25,
    justifyContent: 'center',
  },
  accountCard: {
    flex: 0.8,
    minWidth: 300,
    maxWidth: 390,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.xl,
    borderBottomRightRadius: 10,
    padding: 28,
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  accountEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tones.orange.solid,
  },
  accountEyebrowText: {
    color: palette.inkMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  accountTitle: {
    color: palette.ink,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  accountHint: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  accountFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  accountFooterText: {
    color: palette.inkMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  footerDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.line,
  },
  heroTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingBottom: 10,
    marginBottom: 20,
  },
  heroKicker: {
    color: palette.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroIndex: {
    color: palette.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  desktopHeadline: {
    fontSize: 52,
    lineHeight: 54,
  },
  desktopShelfPanel: {
    paddingTop: 48,
    paddingBottom: 34,
    paddingHorizontal: 36,
    minHeight: 240,
    justifyContent: 'center',
  },
  desktopLead: {
    fontSize: 17,
    lineHeight: 26,
  },
  promiseRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: palette.line,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    marginBottom: 22,
  },
  promise: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  promiseNumber: {
    color: tones.lavender.solid,
    fontSize: 11,
    fontWeight: '900',
  },
  promiseText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

  /* shared text */
  lead: { fontSize: 15, lineHeight: 23, color: palette.inkSoft, marginBottom: 24 },
  section: { marginTop: 36 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: palette.ink,
    marginBottom: 18,
  },
  sectionKicker: {
    color: palette.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  desktopSection: {
    marginTop: 16,
  },
  empty: { fontSize: 14, lineHeight: 20, color: palette.inkMuted },

  /* signed out */
  mark: {
    alignSelf: 'flex-start',
    backgroundColor: palette.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 28,
    transform: [{ rotate: '-3deg' }],
  },
  markText: { color: palette.paper, fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  headline: {
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1.6,
    color: palette.ink,
    marginBottom: 24,
  },
  shelfPanel: {
    backgroundColor: tones.lavender.soft,
    borderRadius: radius.xl,
    borderBottomLeftRadius: 8,
    paddingTop: 36,
    paddingBottom: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  mobileAccountCard: {
    width: '100%',
  },
  ctas: { gap: 10 },
  ctaPrimary: {
    backgroundColor: tones.golden.solid,
    borderRadius: radius.pill,
    paddingVertical: 17,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  ctaSecondary: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.ink,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaSecondaryText: { color: palette.ink, fontSize: 15, fontWeight: '700' },

  /* signed in */
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tones.golden.solid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: palette.ink },
  greetText: { flex: 1 },
  greetSmall: { fontSize: 14, color: palette.inkMuted },
  greetName: { fontSize: 28, fontWeight: '900', letterSpacing: -0.9, color: palette.ink },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  roleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tones.lavender.solid },
  roleText: { fontSize: 13, fontWeight: '700', color: tones.lavender.solid },
  actions: { gap: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});