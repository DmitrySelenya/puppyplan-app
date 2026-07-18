import { useRouter } from 'expo-router';

import { HealthScreen } from '@/features/health/screens/HealthScreen';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useHealthRecordsQuery } from '@/lib/query/health-records';

export default function PetRoute() {
  const router = useRouter();
  const activeCare = useActiveCareContext();
  const healthRecords = useHealthRecordsQuery(activeCare.careContext?.puppyId);
  const reviewState = activeCare.status === 'loading' || healthRecords.isLoading
    ? 'loading'
    : activeCare.status === 'error'
      || activeCare.careContext === null
      || healthRecords.isError
      ? 'error'
      : undefined;

  return (
    <HealthScreen
      healthRecords={healthRecords.data}
      onOpenAddRecord={() => {
        router.push('/pet/health-record-edit');
      }}
      onOpenHealthRecord={(recordId) => {
        router.push({
          pathname: '/pet/health-record/[recordId]',
          params: { recordId },
        });
      }}
      onOpenPuppyProfile={() => {
        router.push('/settings/puppy-profile');
      }}
      onOpenQuickTrackers={() => {
        router.push('/settings/quick-trackers');
      }}
      puppy={activeCare.puppy}
      reviewState={reviewState}
    />
  );
}
