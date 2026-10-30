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

interface FormData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [form, setForm] = useState<FormData>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [apiError, setApiError] = useState('');

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
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

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

              <Input label="Email Address" placeholder="john.doe@gmail.com" value={form.email} onChangeText={updateField('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
              <Input label="Username" placeholder="johndoe123" value={form.username} onChangeText={updateField('username')} error={errors.username} autoCapitalize="none" />
              <Input label="Password" placeholder="At least 6 characters" value={form.password} onChangeText={updateField('password')} error={errors.password} secureTextEntry showPasswordToggle />
              <Input label="Confirm Password" placeholder="Re-enter your password" value={form.confirmPassword} onChangeText={updateField('confirmPassword')} error={errors.confirmPassword} secureTextEntry showPasswordToggle />

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

