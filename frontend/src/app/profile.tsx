import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { SECTIONS } from '@/constants/sections';

const roleLabels: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  'program chair': 'Program Chair',
  program_chair: 'Program Chair',
  admin: 'Administrator',
};

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    avatar: '',
    section: '',
    tuptId: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        avatar: user.avatar || '',
        section: user.section || '',
        tuptId: user.tuptId || '',
      });
    }
  }, [user]);

  const initials = useMemo(
    () => `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U',
    [user],
  );
  const role = user?.role || 'student';
  const isStudent = role === 'student';

  const setField = (field: keyof typeof form, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setNotice(null);
  };

  const chooseProfilePhoto = async () => {
    setNotice(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice({ type: 'error', text: 'Photo library permission is required to choose a profile photo.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;
    if (dataUrl.length > 2.8 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Please choose a profile photo smaller than 2 MB.' });
      return;
    }
    setField('avatar', dataUrl);
  };

  const cancelEdit = () => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        avatar: user.avatar || '',
        section: user.section || '',
        tuptId: user.tuptId || '',
      });
    }
    setNotice(null);
    setIsEditing(false);
  };

  const saveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim() || !form.email.trim()) {
      setNotice({ type: 'error', text: 'First name, last name, username, and email are required.' });
      return;
    }
    if (isStudent && !form.section) {
      setNotice({ type: 'error', text: 'Please choose your section.' });
      return;
    }
        if (isStudent && !form.tuptId.trim()) {
      setNotice({ type: 'error', text: 'Please enter your TUPT-ID.' });
      return;
    }
    if (isStudent && !/^TUPT-\d{2}-\d{3,5}$/i.test(form.tuptId.trim())) {
      setNotice({ type: 'error', text: 'Use the TUPT-ID format TUPT-22-0123.' });
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      avatar: form.avatar.trim(),
      ...(isStudent ? { section: form.section, tuptId: form.tuptId.trim().toUpperCase() } : {}),
    });
    setIsSaving(false);
    setNotice({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) setIsEditing(false);
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.mutedText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>Manage your account information</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.profileHeader}>
          {form.avatar ? (
            <Image source={{ uri: form.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileHeading}>
            <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.role}>{roleLabels[role] || role}</Text>
            <Text style={styles.verification}>{user.isVerified ? 'Verified account' : 'Verification pending'}</Text>
          </View>
          {isEditing && (
            <Button
              title="Choose Photo"
              variant="outline"
              size="sm"
              onPress={chooseProfilePhoto}
              style={styles.photoButton}
            />
          )}
        </View>

        {notice && (
          <View style={[styles.notice, notice.type === 'error' ? styles.errorNotice : styles.successNotice]}>
            <Text style={styles.noticeText}>{notice.text}</Text>
          </View>
        )}

        <View style={styles.formGrid}>
          <Input label="First Name" value={form.firstName} editable={isEditing} onChangeText={value => setField('firstName', value)} />
          <Input label="Last Name" value={form.lastName} editable={isEditing} onChangeText={value => setField('lastName', value)} />
          <Input label="Username" value={form.username} editable={isEditing} onChangeText={value => setField('username', value)} />
          <Input label="Email" value={form.email} editable={isEditing} keyboardType="email-address" onChangeText={value => setField('email', value)} />
                    {isStudent && (
            <Input label="TUPT-ID" value={form.tuptId} editable={isEditing} autoCapitalize="characters" onChangeText={value => setField('tuptId', value)} />
          )}
          {isStudent && isEditing && (
            <View style={styles.sectionPicker}>
              <Text style={styles.sectionPickerLabel}>Section</Text>
              <View style={styles.sectionWrap}>
                {SECTIONS.map(sec => (
                  <Pressable
                    key={sec}
                    onPress={() => setField('section', sec)}
                    style={[styles.sectionChip, form.section === sec && styles.sectionChipActive]}
                  >
                    <Text style={[styles.sectionChipText, form.section === sec && styles.sectionChipTextActive]}>{sec}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isStudent ? 'Academic Information' : 'Role Information'}</Text>
          {isStudent ? (
            <>
              <InfoRow label="Section" value={user.section || 'Not set — tap Edit Profile to choose'} />
              <InfoRow label="TUPT-ID" value={user.tuptId || 'Not set — tap Edit Profile to add'} />
              <InfoRow label="Year Level" value={user.yearLevel || 'Not available'} />
              <InfoRow label="Active Semester" value={user.activeSemester || 'Not available'} />
              <InfoRow label="School Year" value={user.schoolYear || 'Not available'} />
              <InfoRow label="Enrolled Subjects" value={`${user.enrolledSubjects?.length || 0} subject(s)`} />
            </>
          ) : (
            <InfoRow label="Account Role" value={roleLabels[role] || role} />
          )}
        </View>

        <View style={styles.actions}>
          {isEditing ? (
            <>
              <Button title="Cancel" variant="outline" onPress={cancelEdit} disabled={isSaving} />
              <Button title="Save Changes" onPress={saveProfile} loading={isSaving} />
            </>
          ) : (
            <Button title="Edit Profile" onPress={() => { setNotice(null); setIsEditing(true); }} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { width: '100%', maxWidth: 760, alignSelf: 'center', marginBottom: 20 },
  backButton: { alignSelf: 'flex-start', marginBottom: 12 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  card: { width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: COLORS.white, borderRadius: 18, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  photoButton: { marginLeft: 'auto' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  profileHeading: { marginLeft: 16, flex: 1 },
  name: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  role: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 3 },
  verification: { color: COLORS.success, fontSize: 12, marginTop: 4 },
  notice: { borderRadius: 10, padding: 12, marginBottom: 18 },
  successNotice: { backgroundColor: COLORS.successLight },
  errorNotice: { backgroundColor: COLORS.errorLight },
  noticeText: { color: COLORS.text, fontSize: 13 },
  formGrid: { width: '100%' },
  sectionPicker: { marginBottom: 16 },
  sectionPickerLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  sectionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  section: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20, marginTop: 4 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 16 },
  infoLabel: { color: COLORS.textMuted, fontSize: 14 },
  infoValue: { color: COLORS.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  mutedText: { color: COLORS.textMuted },
});