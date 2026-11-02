import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/constants/colors';
import { SECTIONS } from '@/constants/sections';

interface FormData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  tuptId: string;
  section: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  tuptId?: string;
  section?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [form, setForm] = useState<FormData>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    tuptId: '',
    section: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAtBottom, setTermsAtBottom] = useState(false);

  const updateField = (field: keyof FormData) => (value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = 'Enter a valid email address';
    if (!form.username.trim()) newErrors.username = 'Username is required';
    else if (form.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.tuptId.trim()) newErrors.tuptId = 'TUPT-ID is required';
    else if (!/^TUPT-\d{2}-\d{3,5}$/i.test(form.tuptId.trim())) newErrors.tuptId = 'Use the format TUPT-22-0123';
    if (!form.section) newErrors.section = 'Please choose your section';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!termsAccepted) newErrors.terms = 'You must accept the Terms and Conditions to create an account';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setApiError('');
    setSuccessMessage('');
    if (!validate()) return;

    const result = await register(form);
    if (result.success) {
      setSuccessMessage(result.message || 'Registration successful! Please check your Gmail to verify your account before logging in.');
    } else {
      setApiError(result.message);
    }
  };

  if (successMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Verification Required</Text>
          <Text style={styles.successMessage}>{successMessage}</Text>
          <View style={styles.successCard}>
            <Text style={styles.successHint}>Open your email inbox and click the verification link to activate your account.</Text>
          </View>
          <Button
            title="Go to Sign In"
            onPress={() => router.push('/login')}
            size="lg"
            style={styles.successButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>LMS</Text>
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Start your academic journey today</Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              {apiError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{apiError}</Text>
                </View>
              ) : null}

              <View style={styles.rowGroup}>
                <View style={styles.halfField}>
                  <Input label="First Name" placeholder="John" value={form.firstName} onChangeText={updateField('firstName')} error={errors.firstName} />
                </View>
                <View style={styles.halfField}>
                  <Input label="Last Name" placeholder="Doe" value={form.lastName} onChangeText={updateField('lastName')} error={errors.lastName} />
                </View>
              </View>

              {/* Section picker */}
              <Text style={styles.sectionLabel}>Section</Text>
              <View style={styles.sectionWrap}>
                {SECTIONS.map(sec => (
                  <Pressable
                    key={sec}
                    onPress={() => updateField('section')(sec)}
                    style={[styles.sectionChip, form.section === sec && styles.sectionChipActive]}
                  >
                    <Text style={[styles.sectionChipText, form.section === sec && styles.sectionChipTextActive]}>{sec}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.section ? <Text style={styles.sectionError}>{errors.section}</Text> : null}
              
              <Input label="TUPT-ID" placeholder="TUPT-22-0123" value={form.tuptId} onChangeText={updateField('tuptId')} error={errors.tuptId} autoCapitalize="characters" />
              <Input label="Email Address" placeholder="john.doe@gmail.com" value={form.email} onChangeText={updateField('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
              <Input label="Username" placeholder="johndoe123" value={form.username} onChangeText={updateField('username')} error={errors.username} autoCapitalize="none" />
              <Input label="Password" placeholder="At least 6 characters" value={form.password} onChangeText={updateField('password')} error={errors.password} secureTextEntry showPasswordToggle />
              <Input label="Confirm Password" placeholder="Re-enter your password" value={form.confirmPassword} onChangeText={updateField('confirmPassword')} error={errors.confirmPassword} secureTextEntry showPasswordToggle />

              <View style={styles.termsCard}>
                <Text style={styles.termsTitle}>Terms and Conditions</Text>
                <ScrollView
                  style={styles.termsScroll}
                  nestedScrollEnabled
                  onScroll={({ nativeEvent }) => {
                    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 8) {
                      setTermsAtBottom(true);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  <Text style={styles.termsText}>
                    By creating an account and using this Learning Management System (LMS), you agree to the following:
                  </Text>
                  <Text style={styles.termsItem}>1. Provide accurate and complete personal and academic information.</Text>
                  <Text style={styles.termsItem}>2. Use your account only for legitimate academic and educational purposes.</Text>
                  <Text style={styles.termsItem}>3. Keep your password and account credentials confidential. You are responsible for activity under your account.</Text>
                  <Text style={styles.termsItem}>4. Do not impersonate another person, share your account, or attempt to access another user’s account.</Text>
                  <Text style={styles.termsItem}>5. Do not upload, share, or distribute content that is unlawful, abusive, misleading, or infringes another person’s rights.</Text>
                  <Text style={styles.termsItem}>6. Do not interfere with the LMS, bypass security controls, or use the system to distribute malicious software.</Text>
                  <Text style={styles.termsItem}>7. Understand that academic content, submissions, grades, and account activity may be recorded and processed to provide LMS services.</Text>
                  <Text style={styles.termsItem}>8. Report suspected unauthorized access, security issues, or inaccurate account information to the school or system administrator.</Text>
                  <Text style={styles.termsItem}>9. The school or system administrator may suspend or remove accounts that violate these terms or applicable school policies.</Text>
                  <Text style={styles.termsItem}>10. These terms may be updated when necessary. Continued use of the LMS after an update means you accept the revised terms.</Text>
                  {termsAtBottom ? (
                    <>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: termsAccepted }}
                        onPress={() => {
                          setTermsAccepted(prev => !prev);
                          if (errors.terms) setErrors(prev => ({ ...prev, terms: undefined }));
                        }}
                        style={styles.termsCheckboxRow}
                      >
                        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                          {termsAccepted ? <Text style={styles.checkboxIcon}>✓</Text> : null}
                        </View>
                        <Text style={styles.termsAgreement}>I have read and agree to the Terms and Conditions.</Text>
                      </Pressable>
                      {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}
                    </>
                  ) : (
                    <Text style={styles.termsScrollHint}>Continue scrolling to accept the Terms and Conditions.</Text>
                  )}
                </ScrollView>
              </View>

              <Button title="Create Account" onPress={handleRegister} loading={isLoading} size="lg" style={styles.submitButton} />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 28 },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoText: { color: COLORS.white, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: COLORS.errorLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorBannerText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '500' },
  rowGroup: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  sectionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  sectionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  sectionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sectionChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  sectionChipTextActive: { color: COLORS.white },
  sectionError: { fontSize: 12, color: COLORS.error, marginBottom: 8 },
  termsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  termsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  termsScroll: { maxHeight: 190, marginBottom: 12 },
  termsScrollHint: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  termsText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  termsItem: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 7 },
  termsCheckboxRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxIcon: { color: COLORS.white, fontSize: 15, fontWeight: '800', lineHeight: 18 },
  termsAgreement: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },
  termsError: { fontSize: 12, color: COLORS.error, marginTop: 8 },
  submitButton: { marginTop: 8, width: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  footerLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: COLORS.background,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF9E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F9E79F',
  },
  successIcon: { fontSize: 48 },
  successTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  successMessage: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  successCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
    width: '100%',
  },
  successHint: { fontSize: 14, color: '#2471A3', lineHeight: 20 },
  successButton: { width: '100%' },
});