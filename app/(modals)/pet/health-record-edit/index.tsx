import { router } from 'expo-router';

import { HealthRecordEditRouteScreen } from '@/features/health/screens/HealthScreen';

export default function HealthRecordEditRoute() {
  return (
    <HealthRecordEditRouteScreen
      onClose={() => {
        router.back();
      }}
    />
  );
}
