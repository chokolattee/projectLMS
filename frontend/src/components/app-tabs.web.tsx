import React from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { ProfileDropdown } from './ProfileDropdown';

export function TabButton({ children, isFocused, ...props }: any) {
  const { ref, ...rest } = props;
  return (
    <Pressable
      ref={ref}
      {...rest}
      style={({ pressed }: { pressed: boolean }) => [styles.tabBtn, pressed && styles.tabBtnPressed]}
    >
      <View style={[styles.tabBtnInner, isFocused && styles.tabBtnActive]}>
        <Text style={[styles.tabBtnText, isFocused && styles.tabBtnTextActive]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

function CustomTabList({ isAuthenticated, children, ...props }: TabListProps & { isAuthenticated: boolean }) {
  return (
    <View style={styles.tabListOuter}>
      <View style={styles.tabListInner}>
        {/* Brand */}
        <View style={styles.brandContainer}>
          <View style={styles.brandLogo}>
            <Text style={styles.brandLogoText}>LMS</Text>
          </View>
          <View>
            <Text style={styles.brandName}>EduPortal</Text>
            <Text style={styles.brandSub}>Learning Management</Text>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.navGroup}>
          {children}
        </View>

        {/* Right Header / Profile Section */}
        <View style={styles.rightGroup}>
          {isAuthenticated ? (
            <ProfileDropdown />
          ) : (
            <View style={styles.authBadge}>
              <Text style={styles.authBadgeText}>Guest Access</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function AppTabs() {
  const { isAuthenticated, user } = useAuth();

  return (
    <View style={styles.container}>
      <Tabs>
        <TabList asChild>
          <CustomTabList isAuthenticated={isAuthenticated}>
            <TabTrigger name="index" href="/" asChild>
              <TabButton>Home</TabButton>
            </TabTrigger>
            {isAuthenticated ? (
              user?.role === 'program chair' || user?.role === 'admin' ? (
                <>
                  <TabTrigger name="chair" href={'/chair/dashboard' as any} asChild>
                    <TabButton>Chair Portal</TabButton>
                  </TabTrigger>
                  <TabTrigger name="faculty" href={'/faculty/dashboard' as any} asChild>
                    <TabButton>Faculty Studio</TabButton>
                  </TabTrigger>
                </>
              ) : user?.role === 'faculty' ? (
                <TabTrigger name="faculty" href={'/faculty/dashboard' as any} asChild>
                  <TabButton>Faculty Dashboard</TabButton>
                </TabTrigger>
              ) : (
                <TabTrigger name="student" href="/student/dashboard" asChild>
                  <TabButton>Student Dashboard</TabButton>
                </TabTrigger>
              )
            ) : (
              <>
                <TabTrigger name="login" href="/login" asChild>
                  <TabButton>Sign In</TabButton>
                </TabTrigger>
                <TabTrigger name="register" href="/register" asChild>
                  <TabButton>Get Started</TabButton>
                </TabTrigger>
              </>
            )}
          </CustomTabList>
        </TabList>

        <View style={styles.slotContainer}>
          <TabSlot style={styles.slot} />
        </View>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabListOuter: {
    position: 'relative',
    zIndex: 100,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  tabListInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 32,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  brandLogoText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  rightGroup: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  authBadge: {
    backgroundColor: COLORS.inputBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabBtnPressed: {
    opacity: 0.8,
  },
  tabBtnInner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#FDEDEC',
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  slotContainer: {
    flex: 1,
    width: '100%',
  },
  slot: {
    flex: 1,
    height: '100%',
  },
});
