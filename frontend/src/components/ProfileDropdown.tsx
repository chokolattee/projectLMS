import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';

export function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    setVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const close = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }).start(() => setVisible(false));
  };

  const handleLogout = () => {
    close();
    setTimeout(() => {
      logout();
      router.replace('/');
    }, 200);
  };

  const handleViewProfile = () => {
    setVisible(false);
    router.push('/profile' as any);
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || (user?.role === 'faculty' ? 'FA' : 'ST');
  const roleLabel = user?.role === 'faculty'
    ? 'Faculty'
    : user?.role === 'program chair' || user?.role === 'program_chair'
      ? 'Program Chair'
      : user?.role === 'admin'
        ? 'Administrator'
        : 'Student';

  return (
    <>
      <Pressable style={styles.trigger} onPress={open}>
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.nameContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.firstName ? `${user.firstName} ${user.lastName?.[0] || ''}.` : roleLabel}
          </Text>
          <Text style={styles.role}>{roleLabel}</Text>
        </View>
      </Pressable>

      <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropPressable} onPress={close} />
          <Animated.View style={[styles.dropdown, { opacity: fadeAnim }]}>
            {/* Profile Header */}
            <View style={styles.dropdownHeader}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.dropdownAvatar} />
              ) : (
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.dropdownUserInfo}>
                <Text style={styles.dropdownName}>{user?.firstName} {user?.lastName}</Text>
                <Text style={styles.dropdownEmail} numberOfLines={1}>{user?.email}</Text>
                <Text style={styles.dropdownRoleBadge}>{roleLabel.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.dropdownDivider} />

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={handleViewProfile}
            >
              <Text style={styles.menuText}>My Profile</Text>
            </Pressable>

            {/* Menu Items - Strictly Role-Isolated */}
            {user?.role === 'program chair' || user?.role === 'program_chair' || user?.role === 'admin' ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={() => {
                    close();
                    router.push('/chair/dashboard' as any);
                  }}
                >
                  <Text style={styles.menuText}>Chair Command Center</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={() => {
                    close();
                    router.push('/faculty/dashboard' as any);
                  }}
                >
                  <Text style={styles.menuText}>Faculty Studio</Text>
                </Pressable>
              </>
            ) : user?.role === 'faculty' ? (
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => {
                  close();
                  router.push('/faculty/dashboard' as any);
                }}
              >
                <Text style={styles.menuText}>Faculty Dashboard</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => {
                  close();
                  router.push('/student/dashboard' as any);
                }}
              >
                <Text style={styles.menuText}>Student Dashboard</Text>
              </Pressable>
            )}

            <View style={styles.dropdownDivider} />

            <Pressable
              style={({ pressed }) => [styles.menuItem, styles.menuItemLogout, pressed && styles.menuItemPressed]}
              onPress={handleLogout}
            >
              <Text style={styles.menuTextLogout}>Sign Out</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  nameContainer: {},
  name: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  role: { fontSize: 11, color: COLORS.textMuted },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'web' ? 64 : 80,
    paddingRight: 16,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    minWidth: 250,
    position: 'relative',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dropdownAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  dropdownUserInfo: { flex: 1 },
  dropdownName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dropdownEmail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  dropdownRoleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: '#FDE8E8',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  dropdownDivider: { height: 1, backgroundColor: COLORS.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  menuItemPressed: { backgroundColor: COLORS.inputBg },
  menuItemLogout: {},
  menuIcon: { fontSize: 18 },
  menuText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  menuTextLogout: { fontSize: 14, fontWeight: '600', color: COLORS.error },
});
