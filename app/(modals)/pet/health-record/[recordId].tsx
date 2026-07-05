import { router, useLocalSearchParams } from 'expo-router';

import { HealthRecordDetailRouteScreen } from '@/features/health/screens/HealthScreen';

export default function HealthRecordDetailRoute() {
  const params = useLocalSearchParams<{ recordId?: string | string[] }>();
  const recordId = Array.isArray(params.recordId) ? params.recordId[0] : params.recordId;

  return (
    <HealthRecordDetailRouteScreen
      onClose={() => {
        router.back();
      }}
      recordId={recordId}
    />
  );
}
