import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function ChairLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'My Dashboard' }} />
    </Stack>
  );
}

