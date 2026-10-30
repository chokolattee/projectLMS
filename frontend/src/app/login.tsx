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

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const validate = () => {
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errors.identifier = 'Username or email is required';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setError('');
    if (!validate()) return;

    const result = await login({ identifier: identifier.trim(), password });
    if (!result.success) {
      setError(result.message);
    } else {
      const userRole = result.user?.role;
      if (userRole === 'program chair' || userRole === 'admin') {
        router.replace('/chair/dashboard' as any);
      } else if (userRole === 'faculty') {
        router.replace('/faculty/dashboard' as any);
      } else {
        router.replace('/student/dashboard' as any);
      }
    }
  };

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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="Username or Email"
                placeholder="Enter your username or email"
                value={identifier}
                onChangeText={setIdentifier}
                error={fieldErrors.identifier}
                keyboardType="email-address"
                returnKeyType="next"
                autoCorrect={false}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
                secureTextEntry
                showPasswordToggle
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                size="lg"
                style={styles.loginButton}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={styles.footerLink}>Get Started</Text>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: { color: COLORS.white, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
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
  loginButton: { marginTop: 8, width: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  footerLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});

