import { useRouter } from 'expo-router';

import { HealthScreen } from '@/features/health/screens/HealthScreen';

export default function PetRoute() {
  const router = useRouter();

  return (
    <HealthScreen
      onOpenAddRecord={() => {
        router.push('/pet/health-record-edit');
      }}
      onOpenPuppyProfile={() => {
        router.push('/settings/puppy-profile');
      }}
      onOpenQuickTrackers={() => {
        router.push('/settings/quick-trackers');
      }}
    />
  );
}
