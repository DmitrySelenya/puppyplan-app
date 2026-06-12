import { router, useLocalSearchParams } from 'expo-router';

import { quickLogDetailTrackerIdSchema } from '@/contracts/quick-log';
import { QuickLogDetailsScreen } from '@/features/quick-log/screens/QuickLogDetailsScreen';
import { closeModalRoute } from '@/lib/navigation/modal-close';

export default function QuickLogDetailsRoute() {
  const params = useLocalSearchParams<{ trackerId?: string | string[] }>();
  const rawTrackerId = Array.isArray(params.trackerId)
    ? params.trackerId[0]
    : params.trackerId;
  const parsedTrackerId = quickLogDetailTrackerIdSchema.safeParse(rawTrackerId);
  const close = () => {
    closeModalRoute(router);
  };

  return (
    <QuickLogDetailsScreen
      initialTrackerId={parsedTrackerId.success ? parsedTrackerId.data : 'feeding_meal'}
      onClose={close}
      onSave={close}
    />
  );
}
