import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';

interface FeatureCardProps {
  tag: string;
  title: string;
  description: string;
}

function FeatureCard({ tag, title, description }: FeatureCardProps) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureTagContainer}>
        <Text style={styles.featureTagText}>{tag}</Text>
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    const isChair = user.role === 'program chair' || user.role === 'program_chair' || user.role === 'admin';
    const isFaculty = user.role === 'faculty';

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <View style={styles.authHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{user.firstName?.[0]}{user.lastName?.[0]}</Text>
              </View>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  {isChair ? 'PROGRAM CHAIR PORTAL' : isFaculty ? 'FACULTY PORTAL' : 'STUDENT PORTAL'}
                </Text>
              </View>
              <Text style={styles.welcomeBackGreeting}>Welcome back,</Text>
              <Text style={styles.welcomeBackName}>{user.firstName} {user.lastName}</Text>
              <Text style={styles.welcomeBackSub}>
                {isChair
                  ? 'Manage institutional accounts, academic status cohorts, and smart enrollments.'
                  : isFaculty
                    ? 'Manage your subjects, modules, presentations, and assessments.'
                    : 'Track your enrolled subjects, learning materials, and quizzes.'}
              </Text>
            </View>

            <View style={styles.quickActionsGrid}>
              {isChair ? (
                <>
                  <Pressable
                    style={[styles.quickAction, styles.quickActionPrimary]}
                    onPress={() => router.push('/chair/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategory}>ADMIN COMMAND</Text>
                    <Text style={[styles.quickActionLabel, { color: COLORS.white }]}>Chair Dashboard</Text>
                    <Text style={styles.quickActionHintLight}>Accounts & lifecycle portal</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.quickAction, styles.quickActionSecondary]}
                    onPress={() => router.push('/faculty/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategorySecondary}>CURRICULUM</Text>
                    <Text style={styles.quickActionLabel}>Faculty Studio</Text>
                    <Text style={styles.quickActionHint}>Course manager & topics</Text>
                  </Pressable>
                </>
              ) : isFaculty ? (
                <>
                  <Pressable
                    style={[styles.quickAction, styles.quickActionPrimary]}
                    onPress={() => router.push('/faculty/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategory}>WORKSPACE</Text>
                    <Text style={[styles.quickActionLabel, { color: COLORS.white }]}>Faculty Dashboard</Text>
                    <Text style={styles.quickActionHintLight}>Course manager and studio</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.quickAction, styles.quickActionSecondary]}
                    onPress={() => router.push('/faculty/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategorySecondary}>CURRICULUM</Text>
                    <Text style={styles.quickActionLabel}>Course Modules</Text>
                    <Text style={styles.quickActionHint}>Organize topic hierarchy</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.quickAction, styles.quickActionSecondary]}
                    onPress={() => router.push('/faculty/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategorySecondary}>ASSESSMENT</Text>
                    <Text style={styles.quickActionLabel}>Quiz Studio</Text>
                    <Text style={styles.quickActionHint}>Multiple choice builder</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.quickAction, styles.quickActionSecondary]}
                    onPress={() => router.push('/faculty/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategorySecondary}>STORAGE</Text>
                    <Text style={styles.quickActionLabel}>Presentations</Text>
                    <Text style={styles.quickActionHint}>AWS S3 cloud distribution</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={[styles.quickAction, styles.quickActionPrimary]}
                    onPress={() => router.push('/student/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategory}>STUDENT</Text>
                    <Text style={[styles.quickActionLabel, { color: COLORS.white }]}>Student Dashboard</Text>
                    <Text style={styles.quickActionHintLight}>Access learning center</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.quickAction, styles.quickActionSecondary]}
                    onPress={() => router.push('/student/dashboard' as any)}
                  >
                    <Text style={styles.quickActionCategorySecondary}>ACADEMICS</Text>
                    <Text style={styles.quickActionLabel}>Enrolled Courses</Text>
                    <Text style={styles.quickActionHint}>View enrolled curriculum</Text>
                  </Pressable>
                </>
              )}
            </View>

            {!isFaculty && (
              <View style={styles.enrolledSection}>
                <Text style={styles.enrolledTitle}>Current Enrolled Courses</Text>
                {user.enrolledSubjects && user.enrolledSubjects.length > 0 ? (
                  user.enrolledSubjects.slice(0, 3).map((subj, i) => (
                    <View key={i} style={styles.enrolledItem}>
                      <View style={styles.enrolledDot} />
                      <Text style={styles.enrolledSubjText}>{subj.code} — {subj.title}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyEnrolledText}>No courses currently active. Contact your faculty advisor.</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.heroLogo}>
              <Text style={styles.heroLogoText}>LMS</Text>
            </View>
            <Text style={styles.heroTagline}>ACADEMIC MANAGEMENT PLATFORM</Text>
            <Text style={styles.heroTitle}>Structured Learning & Faculty Course Studio</Text>
            <Text style={styles.heroSubtitle}>
              Access modular curriculum structures, structured assessments, and academic resources through a centralized platform.
            </Text>

            <View style={styles.heroCTAs}>
              <Pressable style={styles.ctaPrimary} onPress={() => router.push('/login')}>
                <Text style={styles.ctaPrimaryText}>Sign In to Access Portal</Text>
              </Pressable>
              <Pressable style={styles.ctaSecondary} onPress={() => router.push('/register')}>
                <Text style={styles.ctaSecondaryText}>Create an Account</Text>
              </Pressable>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresHeading}>Platform Capabilities</Text>
            <View style={styles.featuresGrid}>
              <FeatureCard
                tag="CURRICULUM"
                title="Modular Structure"
                description="Organize subjects into distinct units, lessons, and structured syllabus topics."
              />
              <FeatureCard
                tag="ASSESSMENT"
                title="Quiz Engine"
                description="Configure multiple-choice assessments with customizable passing criteria and timers."
              />
              <FeatureCard
                tag="PRESENTATION"
                title="Cloud Storage"
                description="Upload presentation files directly to secure cloud storage infrastructure."
              />
              <FeatureCard
                tag="ACADEMICS"
                title="Role Segregation"
                description="Strict permission boundaries isolating faculty management from student learners."
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1 },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  // Hero
  hero: { alignItems: 'center', marginBottom: 40 },
  heroLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  heroLogoText: { color: COLORS.white, fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
  heroTagline: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  heroCTAs: { width: '100%', gap: 12 },
  ctaPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  ctaSecondary: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  ctaSecondaryText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  // Features
  featuresSection: { marginTop: 8 },
  featuresHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureTagContainer: {
    backgroundColor: '#FDE8E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  featureTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  featureDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  // Authenticated user view
  authHeader: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  roleTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  roleTagText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  welcomeBackGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 2 },
  welcomeBackName: { color: COLORS.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  welcomeBackSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 6, textAlign: 'center' },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    width: '48%',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
  },
  quickActionSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  quickActionCategorySecondary: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  quickActionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  quickActionHint: { fontSize: 11, color: COLORS.textMuted },
  quickActionHintLight: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  enrolledSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  enrolledTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  enrolledItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  enrolledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  enrolledSubjText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  emptyEnrolledText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 8 },
});
